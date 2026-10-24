import { auth } from "@/auth";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

async function html(req: Request) {
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const file = path.join(process.cwd(), "src/assets/tien-do.html");
  const body = await readFile(file, "utf8");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(req: Request) {
  return html(req);
}

export async function POST(req: Request) {
  return html(req);
}
