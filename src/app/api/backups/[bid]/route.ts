import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireAdmin } from "@/lib/session";
import { backupBefore, stampPid } from "@/lib/backup";
import { publicProject, type ProjectDoc } from "@/lib/access";

type Ctx = { params: Promise<{ bid: string }> };

/** Admin: put a saved version back. The current state is backed up first, so a restore can itself be undone.
 *  If the project was deleted it is re-created (people with a project role must be re-assigned in /admin). */
export async function POST(_req: Request, ctx: Ctx) {
  const r = await requireAdmin();
  if ("error" in r) return r.error;
  const { bid } = await ctx.params;
  const db = await getDb();
  const b = await db.collection("project_backups").findOne({ _id: bid } as never);
  if (!b) return NextResponse.json({ error: "Backup not found" }, { status: 404 });
  const id = String(b.projectId);
  const col = db.collection<ProjectDoc>("projects");
  const cur = await col.findOne({ _id: id });
  const now = Date.now();
  const json = stampPid(b.json, id);
  if (cur) {
    await backupBefore(db, cur, "restore", r.user.email || r.user.id);
    const res = await col.findOneAndUpdate(
      { _id: id },
      { $set: { json, name: String(b.name || cur.name), updatedAt: now, lockedBy: null, lockedByName: null, lockedAt: null }, $inc: { rev: 1 } },
      { returnDocument: "after" },
    );
    return NextResponse.json(publicProject(res!, "admin"));
  }
  const doc = { _id: id, name: String(b.name || "Project"), json, rev: 1, updatedAt: now } as ProjectDoc;
  await col.insertOne(doc);
  return NextResponse.json(publicProject(doc, "admin"), { status: 201 });
}
