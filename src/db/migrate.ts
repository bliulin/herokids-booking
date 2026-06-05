import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import path from "path";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/herokids";

// Single connection for migrations
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);
const migrationsFolder = path.join(process.cwd(), "src/db/migrations");

async function run() {
  console.log("Running migrations from:", migrationsFolder);
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
  await client.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
