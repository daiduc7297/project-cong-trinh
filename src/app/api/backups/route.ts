import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireAdmin } from "@/lib/session";

/** Admin: recent versions (newest first) of every project, including deleted ones. No project data is returned. */
export async function GET() {
  const r = await requireAdmin();
  if ("error" in r) return r.error;
  const db = await getDb();
  const list = await db
    .collection("project_backups")
    .find({}, { projection: { json: 0 } })
    .sort({ savedAt: -1 })
    .limit(150)
    .toArray();
  const ids = [...new Set(list.map((b) => String(b.projectId)))];
  const alive = new Set(
    (await db.collection("projects").find({ _id: { $in: ids } } as never, { projection: { _id: 1 } }).toArray()).map((p) => String(p._id)),
  );
  return NextResponse.json({
    backups: list.map((b) => ({
      id: String(b._id),
      projectId: String(b.projectId),
      name: String(b.name || ""),
      infoName: String(b.infoName || ""),
      rows: Number(b.rows || 0),
      rev: Number(b.rev || 0),
      savedAt: Number(b.savedAt || 0),
      reason: String(b.reason || ""),
      exists: alive.has(String(b.projectId)),
    })),
  });
}
