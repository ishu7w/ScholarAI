import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Lazy singleton — importing this module must never crash in demo mode;
// only calling db() without DATABASE_URL does.
let _db: ReturnType<typeof createDb> | null = null;

function createDb() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set — live data source requires a Postgres connection."
    );
  }
  // Supabase pooled connections: disable prepared statements.
  const client = postgres(url, { prepare: false });
  return drizzle(client, { schema });
}

export function db() {
  if (!_db) _db = createDb();
  return _db;
}

export { schema };
