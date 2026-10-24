import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/api/auth") || path.startsWith("/api/")) return;
  if (path.startsWith("/login")) {
    if (req.auth) {
      return Response.redirect(new URL("/tien-do", req.nextUrl));
    }
    return;
  }
  if (!req.auth) {
    return Response.redirect(new URL("/login", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
