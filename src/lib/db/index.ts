import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

const globalForDb = globalThis as unknown as {
  legionSql?: ReturnType<typeof postgres>;
};

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL ausente: fail-closed");
  }
  return url;
}

function getClient() {
  if (!globalForDb.legionSql) {
    globalForDb.legionSql = postgres(getDatabaseUrl(), {
      max: 5,
      idle_timeout: 20,
      prepare: false,
    });
  }
  return globalForDb.legionSql;
}

export function getDb() {
  return drizzle(getClient(), { schema });
}

export { schema };
