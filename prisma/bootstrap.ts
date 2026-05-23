import { execSync } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

import { env } from "../src/lib/env.js";

const databasePath = env.databaseUrl.replace(/^file:/, "");
const databaseFiles = [
  databasePath,
  `${databasePath}-shm`,
  `${databasePath}-wal`,
  `${databasePath}-journal`,
];

for (const file of databaseFiles) {
  if (existsSync(file)) {
    await rm(file, { force: true });
  }
}

const sql = execSync("npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script", {
  encoding: "utf8",
});

await writeFile("prisma/init.sql", sql, "utf8");

execSync("npx prisma db execute --file prisma/init.sql --schema prisma/schema.prisma", {
  stdio: "inherit",
});
