import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      isAdmin: boolean;
      quickLogin: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    isAdmin?: boolean;
    quickLogin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    quickLogin?: boolean;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    quickLogin?: boolean;
  }
}
