import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireUser } from "@/lib/session";
import {
  canDelete,
  canWrite,
  mergeMemberJson,
  publicProject,
  roleFor,
  type ProjectDoc,
} from "@/lib/access";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const db = await getDb();
  const role = await roleFor(db, r.user.id, r.user.isAdmin, id, r.user.quickLogin);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const doc = await db.collection<ProjectDoc>("projects").findOne({ _id: id });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(publicProject(doc, role));
}

export async function PUT(req: Request, ctx: Ctx) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const db = await getDb();
  const role = await roleFor(db, r.user.id, r.user.isAdmin, id, r.user.quickLogin);
  if (!canWrite(role)) {
    return NextResponse.json({ error: "View only, no edit permission" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  if (!body || body.json == null) {
    return NextResponse.json({ error: "Missing json" }, { status: 400 });
  }
  const col = db.collection<ProjectDoc>("projects");
  const current = await col.findOne({ _id: id });
  if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const rev = Number(body.rev);
  const name = body.name != null ? String(body.name) : undefined;
  const now = Date.now();
  const json = role === "member" ? mergeMemberJson(current.json, body.json) : body.json;
  const set: Record<string, unknown> = { json, updatedAt: now };
  if (name && role !== "member") set.name = name;

  const result = await col.findOneAndUpdate(
    { _id: id, rev },
    { $set: set, $inc: { rev: 1 } },
    { returnDocument: "after" },
  );
  if (!result) {
    const latest = await col.findOne({ _id: id });
    if (!latest) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(publicProject(latest, role), { status: 409 });
  }
  return NextResponse.json(publicProject(result, role));
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const db = await getDb();
  const role = await roleFor(db, r.user.id, r.user.isAdmin, id, r.user.quickLogin);
  if (!canDelete(role)) {
    return NextResponse.json({ error: "Only admins can delete projects" }, { status: 403 });
  }
  const del = await db.collection<ProjectDoc>("projects").deleteOne({ _id: id });
  if (!del.deletedCount) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.collection("members").deleteMany({ projectId: id });
  return NextResponse.json({ ok: true });
}
