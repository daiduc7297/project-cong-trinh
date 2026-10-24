import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/mongo";
import { ensureQuickUser, grantMemberAllProjects } from "@/lib/guest";
import { findUserByPin, validPin } from "@/lib/pin";

class LoginError extends CredentialsSignin {
  code = "invalid_login";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mật khẩu", type: "password" },
        name: { label: "Tên", type: "text" },
        pin: { label: "PIN", type: "password" },
        quick: { label: "Quick", type: "text" },
      },
      async authorize(credentials) {
        const db = await getDb();
        if (String(credentials?.quick || "") === "1") {
          const user = await ensureQuickUser(db);
          const id = String(user._id);
          await grantMemberAllProjects(db, id);
          return {
            id,
            email: String(user.email || ""),
            name: String(user.name || "Member"),
            isAdmin: false,
            quickLogin: true,
          };
        }
        const pin = String(credentials?.pin || "").trim();
        if (pin) {
          if (!validPin(pin)) throw new LoginError();
          const name = String(credentials?.name || "").trim();
          const user = await findUserByPin(db, pin, name || undefined);
          if (!user) throw new LoginError();
          return {
            id: String(user._id),
            email: String(user.email || ""),
            name: String(user.name || "Member"),
            isAdmin: !!user.isAdmin,
          };
        }
        const email = String(credentials?.email || "")
          .trim()
          .toLowerCase();
        const password = String(credentials?.password || "");
        if (!email || !password) throw new LoginError();
        const user = await db.collection("users").findOne({ email });
        if (!user?.passwordHash) throw new LoginError();
        const ok = await bcrypt.compare(password, String(user.passwordHash));
        if (!ok) throw new LoginError();
        return {
          id: String(user._id),
          email: String(user.email),
          name: String(user.name || email),
          isAdmin: !!user.isAdmin,
        };
      },
    }),
  ],
});
