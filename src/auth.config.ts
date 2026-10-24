import type { NextAuthConfig } from "next-auth";

/** Vercel: AUTH_URL thiếu https:// hoặc còn localhost sẽ làm Auth.js ném Invalid URL. */
function ensureAuthUrl() {
  const asOrigin = (value: string) => {
    const raw = value.trim();
    if (!raw) return null;
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const u = new URL(withProto);
      if (!u.hostname) return null;
      return u.origin;
    } catch {
      return null;
    }
  };

  let origin = asOrigin(process.env.AUTH_URL || process.env.NEXTAUTH_URL || "");
  if (process.env.VERCEL) {
    const host = origin ? new URL(origin).hostname : "";
    if (!origin || host === "localhost" || host === "127.0.0.1") {
      origin = asOrigin(
        process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "",
      );
    }
  }
  if (origin) {
    process.env.AUTH_URL = origin;
    process.env.NEXTAUTH_URL = origin;
  } else {
    delete process.env.AUTH_URL;
    delete process.env.NEXTAUTH_URL;
  }
}

ensureAuthUrl();

export const authConfig = {
  trustHost: true,
  basePath: "/api/auth",
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 14 },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = !!(user as { isAdmin?: boolean }).isAdmin;
        token.quickLogin = !!(user as { quickLogin?: boolean }).quickLogin;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = String(token.id || "");
      session.user.isAdmin = !!token.isAdmin;
      session.user.quickLogin = !!token.quickLogin;
      return session;
    },
  },
} satisfies NextAuthConfig;
