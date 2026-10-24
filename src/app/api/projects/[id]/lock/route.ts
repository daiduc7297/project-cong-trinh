import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import {
  LOCK_MS,
  canWrite,
  lockFrom,
  publicProject,
  roleFor,
  type ProjectDoc,
} from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const db = await getDb();
  const role = await roleFor(db, r.user.id, r.user.isAdmin, id, r.user.quickLogin);
  if (!canWrite(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  const steal = !!body.steal;
  const heartbeat = !!body.heartbeat;
  const col = db.collection<ProjectDoc>("projects");
  const doc = await col.findOne({ _id: id });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const lock = lockFrom(doc);
  const mine = lock.lockedBy === r.user.id;
  if (lock.lockedBy && !mine && !steal && !heartbeat) {
    return NextResponse.json({ lock, rev: doc.rev, project: publicProject(doc, role) }, { status: 423 });
  }
  if (heartbeat && lock.lockedBy && !mine) {
    return NextResponse.json({ lock, rev: doc.rev, project: publicProject(doc, role) }, { status: 423 });
  }
  const now = Date.now();
  const result = await col.findOneAndUpdate(
    { _id: id },
    {
      $set: {
        lockedBy: r.user.id,
        lockedByName: r.user.name || r.user.email,
        lockedAt: now,
      },
    },
    { returnDocument: "after" },
  );
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    lock: lockFrom(result),
    rev: result.rev,
    project: publicProject(result, role),
    stolen: steal && lock.lockedBy && !mine,
    ttlMs: LOCK_MS,
  });
}
