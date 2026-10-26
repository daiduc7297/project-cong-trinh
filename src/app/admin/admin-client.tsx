"use client";

import { useEffect, useState } from "react";

type Role = "xem" | "member" | "sua" | "admin";
type Access = { projectId: string; role: Role };
type UserRow = {
  id: string;
  email: string;
  name: string;
  isAdmin: boolean;
  hasPin?: boolean;
  access: Access[];
};
type Project = { id: string; name: string };

function RoleSelect({
  value,
  onChange,
}: {
  value: Role | "";
  onChange: (v: Role | "") => void;
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as Role | "")}>
      <option value="">Not assigned</option>
      <option value="xem">xem</option>
      <option value="member">member (layout only)</option>
      <option value="sua">editor</option>
      <option value="admin">project admin</option>
    </select>
  );
}

export default function AdminClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [err, setErr] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [access, setAccess] = useState<Record<string, Role | "">>({});

  async function load() {
    const r = await fetch("/api/users");
    if (!r.ok) {
      setErr("Could not load the list");
      return;
    }
    const d = await r.json();
    setUsers(d.users);
    setProjects(d.projects);
  }

  useEffect(() => {
    load();
  }, []);

  function accessPayload(map: Record<string, Role | "">): Access[] {
    return Object.entries(map)
      .filter(([, role]) => role)
      .map(([projectId, role]) => ({ projectId, role: role as Role }));
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!email.trim() && !pin.trim()) {
      setErr("Email + password or PIN required");
      return;
    }
    if (pin.trim() && !name.trim()) {
      setErr("Quick-access members need a name");
      return;
    }
    const r = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        pin,
        name: name || email,
        isAdmin,
        access: accessPayload(access),
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      setErr(d.error || "Could not create user");
      return;
    }
    setEmail("");
    setPassword("");
    setPin("");
    setName("");
    setIsAdmin(false);
    setAccess({});
    load();
  }

  async function delUser(u: UserRow) {
    if (!confirm("Delete " + (u.name || u.email) + "?")) return;
    setErr("");
    const r = await fetch("/api/users/" + u.id, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setErr(d.error || "Could not delete");
    else load();
  }

  async function saveUser(
    u: UserRow,
    map: Record<string, Role | "">,
    admin: boolean,
    newPin: string,
  ) {
    setErr("");
    const r = await fetch("/api/users/" + u.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        isAdmin: admin,
        access: accessPayload(map),
        pin: newPin.trim() || undefined,
      }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) setErr(d.error || "Could not save");
    else load();
  }

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: 24, color: "#1a202c" }}>
      <p style={{ marginTop: 0 }}>
        <a href="/tien-do">← Schedule</a>
      </p>
      <h1 style={{ fontSize: 20 }}>User administration</h1>
      {err ? <p style={{ color: "#dc2626" }}>{err}</p> : null}

      <form
        onSubmit={createUser}
        style={{
          display: "grid",
          gap: 8,
          border: "1px solid #cbd5e1",
          padding: 16,
          borderRadius: 8,
          marginBottom: 24,
        }}
      >
        <b>Add user</b>
        <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>
          Member: set a name + PIN (4–8 digits) and assign projects with role <b>member</b>. They use
          quick access and can only mark the layout. Or use email + password for viewer / editor / admin.
        </p>
        <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input
          type="email"
          placeholder="Email (leave blank for PIN only)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          minLength={6}
          placeholder="Password (min. 6, leave blank for PIN only)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          inputMode="numeric"
          pattern="\d{4,8}"
          placeholder="Quick-access PIN (4–8 digits)"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={isAdmin}
            onChange={(e) => setIsAdmin(e.target.checked)}
          />{" "}
          System admin (sees all projects)
        </label>
        {projects.map((p) => (
          <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ minWidth: 220 }}>{p.name}</span>
            <RoleSelect
              value={access[p.id] || ""}
              onChange={(role) => setAccess({ ...access, [p.id]: role })}
            />
          </label>
        ))}
        <button type="submit">Create</button>
      </form>

      {users.map((u) => (
        <UserCard
          key={u.id}
          user={u}
          projects={projects}
          onSave={saveUser}
          onDelete={delUser}
        />
      ))}
    </main>
  );
}

function UserCard({
  user,
  projects,
  onSave,
  onDelete,
}: {
  user: UserRow;
  projects: Project[];
  onSave: (
    u: UserRow,
    map: Record<string, Role | "">,
    admin: boolean,
    pin: string,
  ) => void;
  onDelete: (u: UserRow) => void;
}) {
  const init: Record<string, Role | ""> = {};
  for (const a of user.access) init[a.projectId] = a.role;
  const [map, setMap] = useState<Record<string, Role | "">>(init);
  const [admin, setAdmin] = useState(user.isAdmin);
  const [pin, setPin] = useState("");
  return (
    <section
      style={{
        border: "1px solid #cbd5e1",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <b>{user.name}</b> <span style={{ color: "#64748b" }}>{user.email}</span>
      {user.hasPin ? (
        <span style={{ marginLeft: 8, color: "#0f766e", fontSize: 12 }}>has PIN</span>
      ) : null}
      <div style={{ margin: "8px 0" }}>
        <label>
          <input
            type="checkbox"
            checked={admin}
            onChange={(e) => setAdmin(e.target.checked)}
          />{" "}
          System admin
        </label>
      </div>
      {projects.map((p) => (
        <label key={p.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ minWidth: 220 }}>{p.name}</span>
          <RoleSelect
            value={map[p.id] || ""}
            onChange={(role) => setMap({ ...map, [p.id]: role })}
          />
        </label>
      ))}
      <input
        inputMode="numeric"
        pattern="\d{4,8}"
        placeholder={user.hasPin ? "New PIN (blank = keep)" : "Set PIN (4–8 digits)"}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        style={{ marginTop: 8, display: "block" }}
      />
      <button
        type="button"
        style={{ marginTop: 8 }}
        onClick={() => onSave(user, map, admin, pin)}
      >
        Save
      </button>{" "}
      <button type="button" style={{ marginTop: 8 }} onClick={() => onDelete(user)}>
        Delete
      </button>
    </section>
  );
}
