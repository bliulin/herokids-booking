import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db, sqlite } from "./index";
import path from "path";

const migrationsFolder = path.join(process.cwd(), "src/db/migrations");

console.log("Running migrations from:", migrationsFolder);
migrate(db, { migrationsFolder });
console.log("Migrations complete.");
sqlite.close();
