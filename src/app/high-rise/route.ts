import { auth } from "@/auth";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

// Preview of the high-rise view (LC1.1). Admin only until it is integrated into tien-do.html.
export async function GET(req: Request) {
  const session = await auth();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  if (!session.user?.isAdmin) return NextResponse.redirect(new URL("/tien-do", req.url));
  const file = path.join(process.cwd(), "src/assets/high-rise-lc11.html");
  const body = await readFile(file, "utf8");
  return new NextResponse(body, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
