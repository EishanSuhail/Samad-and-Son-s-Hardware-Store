import { execSync } from "node:child_process";
import pg from "pg";

export const DEFAULT_TEST_URL = "postgresql://postgres@localhost:5432/samad_hardware_test";

/** Creates the test database if needed and applies all migrations to it. Never touches the dev database. */
export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_URL;
  const dbName = new URL(url).pathname.slice(1);
  if (!dbName.endsWith("_test")) throw new Error(`Refusing to run tests against "${dbName}": test database names must end in _test.`);

  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const client = new pg.Client({ connectionString: adminUrl.toString() });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [dbName]);
  if (exists.rowCount === 0) await client.query(`CREATE DATABASE "${dbName}"`);
  await client.end();

  execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url }, stdio: "pipe" });
}
