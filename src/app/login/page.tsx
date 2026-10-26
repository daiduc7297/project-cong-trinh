import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const field: CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 5,
};
const card: CSSProperties = {
  width: "100%",
  maxWidth: 360,
  boxSizing: "border-box",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: 24,
  display: "grid",
  gap: 10,
};
const btn: CSSProperties = {
  marginTop: 6,
  padding: "8px 10px",
  background: "#1f6f8b",
  color: "#fff",
  border: 0,
  borderRadius: 5,
  cursor: "pointer",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/tien-do");
  const q = await searchParams;
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f1f5f9",
        color: "#1a202c",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          justifyContent: "center",
          width: "100%",
          maxWidth: 360 * 2 + 16,
        }}
      >
        <form action="/login/email" method="post" style={card}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Sign in</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Email and password (admin / editor / viewer).
          </p>
          {q.e === "1" ? (
            <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>
              Wrong email or password.
            </p>
          ) : null}
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Email
            <input name="email" type="email" required autoComplete="username" style={field} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Password
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={field}
            />
          </label>
          <button type="submit" style={btn}>
            Sign in
          </button>
        </form>

        <form action="/login/quick" method="post" style={card}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Quick access</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            No account needed. Opens the Layout tab only, to mark units.
          </p>
          {q.e === "2" ? (
            <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>
              Could not sign in, try again.
            </p>
          ) : null}
          <button type="submit" style={{ ...btn, background: "#0f766e" }}>
            Open layout
          </button>
        </form>
      </div>
    </main>
  );
}
