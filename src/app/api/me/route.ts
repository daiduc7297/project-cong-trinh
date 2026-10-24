import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongo";
import { requireUser } from "@/lib/session";

export async function GET() {
  const r = await requireUser();
  if ("error" in r) return r.error;
  const db = await getDb();
  const members = await db
    .collection("members")
    .find({ userId: r.user.id })
    .toArray();
  return NextResponse.json({
    user: r.user,
    projects: members.map((m) => ({
      id: String(m.projectId),
      role: m.role,
    })),
  });
}
