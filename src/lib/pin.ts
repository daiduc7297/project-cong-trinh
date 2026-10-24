import bcrypt from "bcryptjs";
import type { Db, Document } from "mongodb";

export function validPin(pin: string) {
  return /^\d{4,8}$/.test(pin);
}

export async function findUserByPin(
  db: Db,
  pin: string,
  name?: string,
): Promise<Document | null> {
  const users = await db
    .collection("users")
    .find({ pinHash: { $type: "string" } })
    .toArray();
  const hits: Document[] = [];
  for (const u of users) {
    if (await bcrypt.compare(pin, String(u.pinHash))) hits.push(u);
  }
  if (name) {
    const n = name.trim().toLowerCase();
    return hits.find((u) => String(u.name || "").toLowerCase() === n) || null;
  }
  return hits.length === 1 ? hits[0] : null;
}

export async function pinTaken(db: Db, pin: string, exceptUserId?: string) {
  const users = await db
    .collection("users")
    .find({ pinHash: { $type: "string" } })
    .toArray();
  for (const u of users) {
    if (exceptUserId && String(u._id) === exceptUserId) continue;
    if (await bcrypt.compare(pin, String(u.pinHash))) return true;
  }
  return false;
}
