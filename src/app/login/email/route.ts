import { doSignIn } from "@/lib/login";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  await doSignIn(
    {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    },
    "/login?e=1",
  );
}
