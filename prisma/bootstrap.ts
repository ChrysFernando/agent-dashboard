import { execSync } from "node:child_process";

// Push the current Prisma schema to the configured DATABASE_URL.
// Works for SQLite (local) and Postgres (Vercel) — Prisma figures out the
// dialect from schema.prisma. Idempotent: safe to run on an empty database
// or one that already matches the schema.
execSync("npx prisma db push --skip-generate", {
  stdio: "inherit",
  env: process.env,
});
