import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/mongo";
import { requireAdmin } from "@/lib/session";
import { ROLES, type Role } from "@/lib/access";
import { pinTaken, validPin } from "@/lib/pin";

function slug(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 24) || "user";
}

export async function GET() {
  const r = await requireAdmin();
  if ("error" in r) return r.error;
  const db = await getDb();
  const users = await db
    .collection("users")
    .find({}, { projection: { passwordHash: 0, pinHash: 0 } })
    .toArray();
  const withPin = await db
    .collection("users")
    .find({ pinHash: { $type: "string" } }, { projection: { _id: 1 } })
    .toArray();
  const pinIds = new Set(withPin.map((u) => String(u._id)));
  const members = await db.collection("members").find({}).toArray();
  const projects = await db
    .collection("projects")
    .find({}, { projection: { name: 1 } })
    .toArray();
  return NextResponse.json({
    users: users.map((u) => ({
      id: String(u._id),
      email: u.email,
      name: u.name,
      isAdmin: !!u.isAdmin,
      hasPin: pinIds.has(String(u._id)),
      access: members
        .filter((m) => m.userId === String(u._id))
        .map((m) => ({ projectId: m.projectId, role: m.role })),
    })),
    projects: projects.map((p) => ({ id: String(p._id), name: p.name })),
  });
}

export async function POST(req: Request) {
  const r = await requireAdmin();
  if ("error" in r) return r.error;
  const body = await req.json().catch(() => null);
  let email = String(body?.email || "")
    .trim()
    .toLowerCase();
  const password = String(body?.password || "");
  const pin = String(body?.pin || "").trim();
  const name = String(body?.name || email || "Member").trim();
  const isAdmin = !!body?.isAdmin;
  const access = Array.isArray(body?.access) ? body.access : [];
  if (pin && !validPin(pin)) {
    return NextResponse.json({ error: "PIN must be 4–8 digits" }, { status: 400 });
  }
  if (!email && !pin) {
    return NextResponse.json({ error: "Email + password or PIN required" }, { status: 400 });
  }
  if (password && password.length < 6) {
    return NextResponse.json(
      { error: "Password must be at least 6 characters" },
      { status: 400 },
    );
  }
  if (email && !password && !pin) {
    return NextResponse.json({ error: "Password or PIN required" }, { status: 400 });
  }
  if (!email) email = `quick.${slug(name)}.${Date.now().toString(36)}@member.local`;
  const db = await getDb();
  const exists = await db.collection("users").findOne({ email });
  if (exists) {
    return NextResponse.json({ error: "Email already exists" }, { status: 409 });
  }
  if (pin && (await pinTaken(db, pin))) {
    return NextResponse.json({ error: "PIN already in use" }, { status: 409 });
  }
  const doc: Record<string, unknown> = {
    email,
    name,
    isAdmin,
    createdAt: Date.now(),
  };
  if (password.length >= 6) doc.passwordHash = await bcrypt.hash(password, 10);
  if (pin) doc.pinHash = await bcrypt.hash(pin, 10);
  if (!doc.passwordHash && !doc.pinHash) {
    return NextResponse.json({ error: "Password or PIN required" }, { status: 400 });
  }
  const ins = await db.collection("users").insertOne(doc);
  const userId = String(ins.insertedId);
  for (const a of access) {
    const projectId = String(a.projectId || "");
    const role = a.role as Role;
    if (!projectId || !ROLES.includes(role)) continue;
    await db.collection("members").updateOne(
      { projectId, userId },
      { $set: { projectId, userId, role } },
      { upsert: true },
    );
  }
  return NextResponse.json({ id: userId, email }, { status: 201 });
}
