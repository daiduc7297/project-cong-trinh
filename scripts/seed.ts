import { existsSync, readFileSync } from "fs";
import { readFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { MongoClient } from "mongodb";
import { patchDnsForAtlas } from "../src/lib/dns";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      process.env[k] = v;
    }
  }
}

const FILES = [
  { file: "Package 3.json", id: "pkg3", name: "Package 3 – Casa Bonita" },
  { file: "Package 4.json", id: "pkg4", name: "Package 4 – Casa Bonita" },
  { file: "Casa_Bonita_1.json", id: "bonita1", name: "Casa Bonita 1" },
];

async function main() {
  loadEnv();
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Thiếu MONGODB_URI. Copy .env.example → .env.local rồi điền Atlas URI.");
    process.exit(1);
  }
  const email = (process.env.ADMIN_EMAIL || "admin@example.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "doi-mat-khau";
  const name = process.env.ADMIN_NAME || "Quản trị";
  const reset = process.argv.includes("--reset");
  // npm run seed -- --reset --only=pkg3,pkg4   (chỉ ghi đè các dự án được chọn)
  const onlyArg = process.argv.find((x) => x.startsWith("--only="));
  const only = onlyArg ? onlyArg.slice(7).split(",").map((x) => x.trim()).filter(Boolean) : null;
  const list = FILES.filter((f) => !only || only.includes(f.id));

  patchDnsForAtlas();
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(process.env.MONGODB_DB || "tiendo");

  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("members").createIndex({ projectId: 1, userId: 1 }, { unique: true });

  const passwordHash = await bcrypt.hash(password, 10);
  const userRes = await db.collection("users").findOneAndUpdate(
    { email },
    {
      $set: { email, name, passwordHash, isAdmin: true, updatedAt: Date.now() },
      $setOnInsert: { createdAt: Date.now() },
    },
    { upsert: true, returnDocument: "after" },
  );
  if (!userRes?._id) {
    throw new Error("Không tạo được admin");
  }
  const adminId = String(userRes._id);
  console.log("Admin:", email, "id=", adminId);

  const projects = db.collection<{ _id: string }>("projects");
  for (const f of list) {
    const raw = await readFile(path.join(process.cwd(), f.file), "utf8");
    const json = JSON.parse(raw);
    const exists = await projects.findOne({ _id: f.id });
    if (exists && !reset) {
      console.log("Bỏ qua (đã có):", f.id, f.name, "— thêm --reset để ghi đè JSON");
    } else {
      const now = Date.now();
      await projects.updateOne(
        { _id: f.id },
        {
          $set: {
            name: json.info?.name || f.name,
            json,
            updatedAt: now,
          },
          $setOnInsert: { rev: 1, lockedBy: null, lockedByName: null, lockedAt: null },
        },
        { upsert: true },
      );
      if (reset && exists) {
        await projects.updateOne({ _id: f.id }, { $inc: { rev: 1 } });
      }
      console.log(exists ? "Cập nhật" : "Tạo", f.id, f.name);
    }
    await db.collection("members").updateOne(
      { projectId: f.id, userId: adminId },
      { $set: { projectId: f.id, userId: adminId, role: "admin" } },
      { upsert: true },
    );
  }

  await client.close();
  console.log("Xong. Đăng nhập bằng", email);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
