import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

let database: ReturnType<typeof drizzle> | undefined;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url)
    throw new Error("DATABASE_URL is required for financial operations");
  database ??= drizzle(postgres(url), { schema });
  return database;
}
