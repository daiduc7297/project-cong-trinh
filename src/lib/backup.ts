// Version history for projects (collection `project_backups`).
// A copy of the project is stored BEFORE it is overwritten, restored or deleted, so a wrong save
// (e.g. data of project A saved into project B) can be undone from the app (admin: Restore previous version).
import type { Db } from "mongodb";
import { asProjectJson } from "@/lib/access";

export const KEEP_BACKUPS = 60;
const MIN_GAP_MS = 10 * 60_000;

export type BackupReason = "save" | "update" | "delete" | "restore";

type Doc = { _id: string; name?: string; json: unknown; rev?: number };

function stats(json: unknown) {
  const j = asProjectJson(json);
  const info = (j.info && typeof j.info === "object" ? j.info : {}) as Record<string, unknown>;
  return {
    rows: Array.isArray(j.R) ? j.R.length : 0,
    infoName: String(info.name ?? ""),
    size: JSON.stringify(j).length,
  };
}

/** Save a copy of `doc` (its current state). Quiet saves are throttled; big changes are always kept. */
export async function backupBefore(db: Db, doc: Doc, reason: BackupReason, by?: string, nextJson?: unknown) {
  try {
    const col = db.collection("project_backups");
    const cur = stats(doc.json);
    if (reason === "save" || reason === "update") {
      const last = await col.findOne({ projectId: doc._id, reason: { $in: ["save", "update"] } }, { sort: { savedAt: -1 } });
      const next = nextJson === undefined ? null : stats(nextJson);
      const big =
        !!next &&
        (next.infoName !== cur.infoName ||
          Math.abs(next.rows - cur.rows) > Math.max(5, cur.rows * 0.2) ||
          Math.abs(next.size - cur.size) > cur.size * 0.3);
      if (last && !big && Date.now() - Number(last.savedAt) < MIN_GAP_MS) return;
    }
    const savedAt = Date.now();
    await col.insertOne({
      _id: `${doc._id}-${savedAt}-${Math.random().toString(36).slice(2, 7)}`,
      projectId: doc._id,
      name: doc.name || "",
      json: doc.json,
      rev: Number(doc.rev || 0),
      savedAt,
      reason,
      by: by || "",
      ...cur,
    } as never);
    if (reason !== "delete") {
      const old = await col
        .find({ projectId: doc._id, reason: { $ne: "delete" } }, { projection: { _id: 1 } })
        .sort({ savedAt: -1 })
        .skip(KEEP_BACKUPS)
        .toArray();
      if (old.length) await col.deleteMany({ _id: { $in: old.map((x) => x._id) } } as never);
    }
  } catch (e) {
    console.error("backup failed", e); // never block a save because of a backup problem
  }
}

/** Different project? The project id stamped inside the data (`_pid`) must match; otherwise names + size are compared. */
export function wrongProject(id: string, currentJson: unknown, incomingJson: unknown): string | null {
  const inc = asProjectJson(incomingJson);
  const cur = asProjectJson(currentJson);
  if (inc._pid && String(inc._pid) !== id) return `This data belongs to another project (${String(inc._pid)}), not ${id}.`;
  if (inc._pid) return null;
  const nm = (j: Record<string, unknown>) => String(((j.info as Record<string, unknown>) || {}).name ?? "").trim().toLowerCase();
  const a = nm(cur);
  const b = nm(inc);
  const ra = Array.isArray(cur.R) ? cur.R.length : 0;
  const rb = Array.isArray(inc.R) ? inc.R.length : 0;
  if (a && b && a !== b && ra > 0 && Math.abs(ra - rb) > ra * 0.3) {
    return `This data looks like a different project ("${String(((inc.info as Record<string, unknown>) || {}).name)}") – the project here is "${String(((cur.info as Record<string, unknown>) || {}).name)}".`;
  }
  return null;
}

export function stampPid(json: unknown, id: string): unknown {
  if (typeof json === "string") {
    const o = asProjectJson(json);
    o._pid = id;
    return JSON.stringify(o);
  }
  if (json && typeof json === "object") return { ...(json as Record<string, unknown>), _pid: id };
  return json;
}
