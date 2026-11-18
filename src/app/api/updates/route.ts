import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireUser } from "@/lib/session";

// Admin: see which server-side updates ran and their result.
export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  if (!r.user.isAdmin) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const db = await getDb();
  const list = await db.collection("updates").find({}).sort({ at: -1 }).limit(100).toArray();
  const projects = await db
    .collection("projects")
    .find({}, { projection: { name: 1, "json.info.name": 1 } })
    .toArray();
  return NextResponse.json({
    updates: list,
    projects: projects.map((p) => ({ id: p._id, name: p.name, infoName: p.json?.info?.name })),
  });
}
