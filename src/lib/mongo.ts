import { MongoClient, type Db } from "mongodb";
import { patchDnsForAtlas } from "@/lib/dns";

declare global {
  var _mongoClient: Promise<MongoClient> | undefined;
}

export function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!globalThis._mongoClient) {
    patchDnsForAtlas();
    globalThis._mongoClient = new MongoClient(uri).connect().catch((err) => {
      globalThis._mongoClient = undefined;
      throw err;
    });
  }
  return globalThis._mongoClient;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(process.env.MONGODB_DB || "tiendo");
}
