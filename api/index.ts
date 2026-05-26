import type { IncomingMessage, ServerResponse } from "node:http";

import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

// Prepare Fastify + connect Prisma once per cold start; subsequent warm
// invocations reuse the same readyPromise / Prisma client (singleton).
let readyPromise: Promise<unknown> | null = null;

function ensureReady() {
  if (!readyPromise) {
    readyPromise = Promise.all([app.ready(), prisma.$connect()]);
  }
  return readyPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await ensureReady();
  app.server.emit("request", req, res);
}
