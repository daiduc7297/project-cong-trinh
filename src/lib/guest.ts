import type { Db } from "mongodb";

export const QUICK_EMAIL = "quick@member.local";

export async function ensureQuickUser(db: Db) {
  const email = QUICK_EMAIL;
  const existing = await db.collection("users").findOne({ email });
  if (existing) return existing;
  const ins = await db.collection("users").insertOne({
    email,
    name: "Member",
    isAdmin: false,
    quickLogin: true,
    createdAt: Date.now(),
  });
  return {
    _id: ins.insertedId,
    email,
    name: "Member",
    isAdmin: false,
    quickLogin: true,
  };
}

export async function grantMemberAllProjects(db: Db, userId: string) {
  const projects = await db
    .collection("projects")
    .find({}, { projection: { _id: 1 } })
    .toArray();
  for (const p of projects) {
    const projectId = String(p._id);
    await db.collection("members").updateOne(
      { projectId, userId },
      { $setOnInsert: { projectId, userId, role: "member" } },
      { upsert: true },
    );
  }
}
