import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
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
