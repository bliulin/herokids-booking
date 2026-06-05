import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/herokids";

// `max: 1` for the migration client; the app pool uses the default (10).
const isMigrating = process.env.DRIZZLE_MIGRATING === "1";

const client = postgres(connectionString, {
  max: isMigrating ? 1 : 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });
export { client as pgClient };
