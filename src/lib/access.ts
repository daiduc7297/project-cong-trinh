import type { Db, Document } from "mongodb";

export type Role = "xem" | "member" | "sua" | "admin";

export const ROLES: Role[] = ["xem", "member", "sua", "admin"];

export type ProjectDoc = {
  _id: string;
  name: string;
  json: unknown;
  rev: number;
  lockedBy?: string | null;
  lockedByName?: string | null;
  lockedAt?: number | null;
  updatedAt?: number;
};

export type ProjectLock = {
  lockedBy: string | null;
  lockedByName: string | null;
  lockedAt: number | null;
};

export const LOCK_MS = 60_000;

export function lockFrom(doc: Document | null): ProjectLock {
  if (!doc) return { lockedBy: null, lockedByName: null, lockedAt: null };
  const at = doc.lockedAt ? Number(doc.lockedAt) : 0;
  if (!doc.lockedBy || Date.now() - at > LOCK_MS) {
    return { lockedBy: null, lockedByName: null, lockedAt: null };
  }
  return {
    lockedBy: String(doc.lockedBy),
    lockedByName: doc.lockedByName ? String(doc.lockedByName) : null,
    lockedAt: at,
  };
}

export function jsonToString(json: unknown): string {
  return typeof json === "string" ? json : JSON.stringify(json);
}

export async function roleFor(
  db: Db,
  userId: string,
  isAdmin: boolean,
  projectId: string,
  quickLogin = false,
): Promise<Role | null> {
  if (isAdmin) return "admin";
  if (quickLogin) return "member";
  const m = await db.collection("members").findOne({ projectId, userId });
  if (!m?.role) return null;
  if (m.role === "admin" || m.role === "sua" || m.role === "member" || m.role === "xem") {
    return m.role;
  }
  return null;
}

export function canWrite(role: Role | null): boolean {
  return role === "sua" || role === "admin" || role === "member";
}

export function canWriteFull(role: Role | null): boolean {
  return role === "sua" || role === "admin";
}

export function asProjectJson(json: unknown): Record<string, unknown> {
  if (typeof json === "string") {
    try {
      const v = JSON.parse(json);
      return v && typeof v === "object" ? v : {};
    } catch {
      return {};
    }
  }
  if (json && typeof json === "object") return json as Record<string, unknown>;
  return {};
}

/** Member chỉ được ghi tick mặt bằng (`done`), không đụng Gantt / ép cọc. */
export function mergeMemberJson(current: unknown, incoming: unknown) {
  const cur = asProjectJson(current);
  const inc = asProjectJson(incoming);
  return { ...cur, done: inc.done ?? cur.done };
}

export function canDelete(role: Role | null): boolean {
  return role === "admin";
}

export function publicProject(doc: Document, role?: Role | null) {
  const lock = lockFrom(doc);
  return {
    id: String(doc._id),
    name: String(doc.name || "Dự án"),
    json: doc.json,
    rev: Number(doc.rev || 0),
    lock,
    updatedAt: doc.updatedAt ? Number(doc.updatedAt) : 0,
    role: role || undefined,
  };
}
