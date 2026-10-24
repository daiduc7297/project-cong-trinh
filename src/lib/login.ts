import { signIn } from "@/auth";
import { redirect, unstable_rethrow } from "next/navigation";

export async function doSignIn(
  creds: Record<string, string>,
  failTo: string,
) {
  try {
    await signIn("credentials", { ...creds, redirectTo: "/tien-do" });
  } catch (e) {
    unstable_rethrow(e);
    redirect(failTo);
  }
}
