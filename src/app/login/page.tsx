import type { CSSProperties } from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

const field: CSSProperties = {
  padding: "8px 10px",
  border: "1px solid #cbd5e1",
  borderRadius: 5,
};
const card: CSSProperties = {
  width: 360,
  maxWidth: "92vw",
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
        }}
      >
        <form action="/login/email" method="post" style={card}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Đăng nhập</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Email và mật khẩu (admin / sửa / xem).
          </p>
          {q.e === "1" ? (
            <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>
              Sai email hoặc mật khẩu.
            </p>
          ) : null}
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Email
            <input name="email" type="email" required autoComplete="username" style={field} />
          </label>
          <label style={{ display: "grid", gap: 4, fontSize: 13 }}>
            Mật khẩu
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              style={field}
            />
          </label>
          <button type="submit" style={btn}>
            Đăng nhập
          </button>
        </form>

        <form action="/login/quick" method="post" style={card}>
          <h1 style={{ margin: 0, fontSize: 18 }}>Đăng nhập nhanh</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
            Không cần tài khoản. Vào tab mặt bằng, chỉ tick căn.
          </p>
          {q.e === "2" ? (
            <p style={{ margin: 0, color: "#dc2626", fontSize: 13 }}>
              Không vào được, thử lại.
            </p>
          ) : null}
          <button type="submit" style={{ ...btn, background: "#0f766e" }}>
            Vào mặt bằng
          </button>
        </form>
      </div>
    </main>
  );
}
