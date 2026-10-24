import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import {
  publicProject,
  type ProjectDoc,
  type Role,
} from "@/lib/access";

export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const db = await getDb();
  const col = db.collection<ProjectDoc>("projects");
  if (r.user.quickLogin && !r.user.isAdmin) {
    const docs = await col.find({}).toArray();
    return NextResponse.json({
      projects: docs.map((doc) => publicProject(doc, "member")),
    });
  }
  const members = await db
    .collection("members")
    .find({ userId: r.user.id })
    .toArray();
  const roleBy = Object.fromEntries(
    members.map((m) => [String(m.projectId), m.role as Role]),
  );
  let ids: string[] | null = null;
  if (!r.user.isAdmin) {
    ids = members.map((m) => String(m.projectId));
    if (!ids.length) return NextResponse.json({ projects: [] });
  }
  const docs = ids
    ? await col.find({ _id: { $in: ids } }).toArray()
    : await col.find({}).toArray();
  return NextResponse.json({
    projects: docs.map((doc) =>
      publicProject(doc, r.user.isAdmin ? "admin" : roleBy[String(doc._id)] || "xem"),
    ),
  });
}

export async function POST(req: Request) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const body = await req.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const json = body?.json;
  if (!name || json == null) {
    return NextResponse.json({ error: "Thiếu tên hoặc dữ liệu" }, { status: 400 });
  }
  const db = await getDb();
  const col = db.collection<ProjectDoc>("projects");
  if (!r.user.isAdmin) {
    const anyWrite = await db.collection("members").findOne({
      userId: r.user.id,
      role: { $in: ["sua", "admin"] },
    });
    if (!anyWrite) {
      return NextResponse.json({ error: "Không có quyền tạo dự án" }, { status: 403 });
    }
  }
  const id = "p" + Date.now().toString(36);
  const now = Date.now();
  const doc = {
    _id: id,
    name,
    json,
    rev: 1,
    lockedBy: r.user.id,
    lockedByName: r.user.name || r.user.email,
    lockedAt: now,
    updatedAt: now,
  };
  await col.insertOne(doc);
  const role: Role = r.user.isAdmin ? "admin" : "sua";
  await db.collection("members").updateOne(
    { projectId: id, userId: r.user.id },
    { $set: { projectId: id, userId: r.user.id, role } },
    { upsert: true },
  );
  return NextResponse.json(publicProject(doc, role), { status: 201 });
}
