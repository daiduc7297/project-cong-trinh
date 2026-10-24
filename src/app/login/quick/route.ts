import { doSignIn } from "@/lib/login";

export const runtime = "nodejs";

export async function POST() {
  await doSignIn({ quick: "1" }, "/login?e=2");
}
