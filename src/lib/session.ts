import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {
    user: {
      id: session.user.id,
      email: session.user.email || "",
      name: session.user.name || "",
      isAdmin: !!session.user.isAdmin,
      quickLogin: !!session.user.quickLogin,
    },
  };
}

export async function requireAdmin() {
  const r = await requireUser();
  if ("error" in r) return r;
  if (!r.user.isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return r;
}
