import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { requireAdmin } from "@/lib/session";
import { ROLES, type Role } from "@/lib/access";
import { pinTaken, validPin } from "@/lib/pin";
type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const r = await requireAdmin();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const db = await getDb();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const set: Record<string, unknown> = {};
  if (body.name != null) set.name = String(body.name).trim();
  if (typeof body.isAdmin === "boolean") set.isAdmin = body.isAdmin;
  if (body.password) {
    if (String(body.password).length < 6) {
      return NextResponse.json({ error: "Mật khẩu tối thiểu 6 ký tự" }, { status: 400 });
    }
    set.passwordHash = await bcrypt.hash(String(body.password), 10);
  }
  if (body.pin != null && String(body.pin).trim()) {
    const pin = String(body.pin).trim();
    if (!validPin(pin)) {
      return NextResponse.json({ error: "PIN phải là 4–8 chữ số" }, { status: 400 });
    }
    if (await pinTaken(db, pin, id)) {
      return NextResponse.json({ error: "PIN đã dùng" }, { status: 409 });
    }
    set.pinHash = await bcrypt.hash(pin, 10);
  }
  if (Object.keys(set).length) {
    await db.collection("users").updateOne({ _id: oid }, { $set: set });
  }
  if (Array.isArray(body.access)) {
    await db.collection("members").deleteMany({ userId: id });
    for (const a of body.access) {
      const projectId = String(a.projectId || "");
      const role = a.role as Role;
      if (!projectId || !ROLES.includes(role)) continue;
      await db.collection("members").insertOne({ projectId, userId: id, role });
    }
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const r = await requireAdmin();
  if ("error" in r) return r.error;
  const { id } = await ctx.params;
  if (id === r.user.id) {
    return NextResponse.json({ error: "Không xóa chính mình" }, { status: 400 });
  }
  const db = await getDb();
  let oid: ObjectId;
  try {
    oid = new ObjectId(id);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await db.collection("users").deleteOne({ _id: oid });
  await db.collection("members").deleteMany({ userId: id });
  return NextResponse.json({ ok: true });
}
