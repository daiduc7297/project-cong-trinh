// Server-side updates shipped with the code (src/updates/*.json, listed in src/updates/index.ts).
// Lets Claude change live project data without anyone importing a JSON file:
// commit an update file to main → Vercel redeploys → the next request applies it once.
// Each update is recorded in the `updates` collection (_id = update id) so it never runs twice.
// A project being edited (lock younger than LOCK_MS) is skipped and retried later.
import type { Db } from "mongodb";
import { LOCK_MS, type ProjectDoc } from "@/lib/access";
import { UPDATES } from "@/updates";

type Json = Record<string, unknown>;

export type UpdateOp =
  // shallow-merge object keys into json[path...] (creates objects as needed), e.g. daily labour
  | { op: "merge"; path: string[]; value: Json }
  // set json[path...] = value
  | { op: "set"; path: string[]; value: unknown }
  // merge fields into tasks R[] by task id
  | { op: "tasks"; set: Record<string, Json> }
  // set CODE:qty inside the task's `res` string (replace or append), e.g. NC per task
  | { op: "resQty"; code: string; values: Record<string, number> }
  // merge fields into the resource with this code (res[]), e.g. lim
  | { op: "resource"; code: string; set: Json }
  // append value to the array at json[path...] (creates it), e.g. a new baseline in bls
  | { op: "push"; path: string[]; value: unknown };

export type ProjectUpdate = {
  id: string;
  /** exact project _id, or */
  projectId?: string;
  /** case-insensitive substring(s) of the project name; the first one matching exactly one project wins */
  projectName?: string | string[];
  note?: string;
  /** only apply if the project is still at this rev (no edits since the update was prepared) */
  expectRev?: number;
  ops: UpdateOp[];
};

const RETRY_MS = 5 * 60_000;
let lastRun = 0;
let running: Promise<void> | null = null;

/** Run pending updates at most once per RETRY_MS per server instance. Never throws. */
export function applyPendingUpdates(db: Db): Promise<void> {
  if (!UPDATES.length) return Promise.resolve();
  if (running) return running;
  if (Date.now() - lastRun < RETRY_MS) return Promise.resolve();
  lastRun = Date.now();
  running = run(db)
    .catch((e) => console.error("[updates]", e))
    .finally(() => {
      running = null;
    });
  return running;
}

async function run(db: Db) {
  const log = db.collection<{ _id: string } & Json>("updates");
  const done = new Set(
    (await log.find({ _id: { $in: UPDATES.map((u) => u.id) } }, { projection: { status: 1 } }).toArray())
      .filter((d) => d.status !== "retry")
      .map((d) => d._id),
  );
  for (const u of UPDATES) {
    if (done.has(u.id)) continue;
    try {
      const res = await applyOne(db, u);
      await log.updateOne({ _id: u.id }, { $set: { ...res, at: Date.now(), note: u.note || "" } }, { upsert: true });
    } catch (e) {
      await log.updateOne(
        { _id: u.id },
        { $set: { status: "error", error: String((e as Error)?.message || e), at: Date.now() } },
        { upsert: true },
      );
    }
  }
}

async function applyOne(db: Db, u: ProjectUpdate): Promise<Json> {
  const col = db.collection<ProjectDoc>("projects");
  let doc: ProjectDoc | null = null;
  if (u.projectId) doc = await col.findOne({ _id: u.projectId });
  else if (u.projectName) {
    const all = (await col.find({}, { projection: { name: 1, "json.info.name": 1 } }).toArray()).map((p) => ({
      _id: p._id,
      name: `${p.name || ""} | ${String(((p.json as Json)?.info as Json)?.name || "")}`,
    }));
    const names = Array.isArray(u.projectName) ? u.projectName : [u.projectName];
    for (const nm of names) {
      const q = nm.toLowerCase();
      const hits = all.filter((p) => String(p.name || "").toLowerCase().includes(q));
      if (hits.length === 1) {
        doc = await col.findOne({ _id: hits[0]._id });
        break;
      }
    }
    if (!doc) {
      return { status: "error", error: `projectName ${JSON.stringify(u.projectName)} did not match exactly one project` };
    }
  }
  if (!doc) return { status: "error", error: "project not found" };

  for (let attempt = 0; attempt < 3; attempt++) {
    if (doc.lockedAt && Date.now() - doc.lockedAt < LOCK_MS) {
      return { status: "retry", reason: `locked by ${doc.lockedByName || doc.lockedBy}` };
    }
    if (u.expectRev != null && doc.rev !== u.expectRev) {
      return { status: "error", error: `project changed since the update was prepared (rev ${doc.rev}, expected ${u.expectRev})` };
    }
    const json = structuredClone((doc.json || {}) as Json);
    const stats = u.ops.map((op) => applyOp(json, op));
    const ok = await col.findOneAndUpdate(
      { _id: doc._id, rev: doc.rev },
      { $set: { json, updatedAt: Date.now() }, $inc: { rev: 1 } },
      { returnDocument: "after" },
    );
    if (ok) return { status: "applied", projectId: doc._id, projectName: doc.name, rev: ok.rev, stats };
    doc = await col.findOne({ _id: doc._id });
    if (!doc) return { status: "error", error: "project vanished" };
  }
  return { status: "retry", reason: "rev conflict" };
}

function walk(json: Json, path: string[]): Json {
  let o = json;
  for (const k of path) {
    if (o[k] == null || typeof o[k] !== "object") o[k] = {};
    o = o[k] as Json;
  }
  return o;
}

function applyOp(json: Json, op: UpdateOp): string {
  switch (op.op) {
    case "merge": {
      const o = walk(json, op.path);
      Object.assign(o, op.value);
      return `merge ${op.path.join(".")}: ${Object.keys(op.value).length} keys`;
    }
    case "set": {
      if (!op.path.length) return "set: empty path";
      const o = walk(json, op.path.slice(0, -1));
      o[op.path[op.path.length - 1]] = op.value;
      return `set ${op.path.join(".")}`;
    }
    case "tasks": {
      const R = (Array.isArray(json.R) ? json.R : []) as Json[];
      const by = new Map(R.map((r) => [String(r.id), r]));
      let n = 0;
      for (const [id, f] of Object.entries(op.set)) {
        const r = by.get(id);
        if (r) {
          Object.assign(r, f);
          n++;
        }
      }
      return `tasks: ${n}/${Object.keys(op.set).length}`;
    }
    case "resQty": {
      const R = (Array.isArray(json.R) ? json.R : []) as Json[];
      const by = new Map(R.map((r) => [String(r.id), r]));
      const code = op.code.replace(/[^A-Za-z0-9_]/g, "");
      const re = new RegExp(`(^|;)\\s*${code}\\s*:\\s*[\\d.]+`);
      let n = 0;
      for (const [id, q] of Object.entries(op.values)) {
        const r = by.get(id);
        if (!r) continue;
        const s = String(r.res || "");
        r.res = re.test(s)
          ? s.replace(re, (_m, p1) => `${p1}${p1 ? " " : ""}${code}:${q}`)
          : s.trim()
            ? `${s.trim()}; ${code}:${q}`
            : `${code}:${q}`;
        n++;
      }
      return `resQty ${code}: ${n}/${Object.keys(op.values).length}`;
    }
    case "push": {
      if (!op.path.length) return "push: empty path";
      const o = walk(json, op.path.slice(0, -1));
      const k = op.path[op.path.length - 1];
      if (!Array.isArray(o[k])) o[k] = [];
      (o[k] as unknown[]).push(op.value);
      return `push ${op.path.join(".")}`;
    }
    case "resource": {
      const list = (Array.isArray(json.res) ? json.res : []) as Json[];
      const r = list.find((x) => x.code === op.code);
      if (!r) return `resource ${op.code}: not found`;
      Object.assign(r, op.set);
      return `resource ${op.code}: updated`;
    }
  }
}
