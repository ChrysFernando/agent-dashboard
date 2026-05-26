import { app } from "./app.js";
import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";

// Local dev entry point. On Vercel the request handler in api/index.ts
// drives the app instead and never calls listen().
await prisma.$connect();
await app.listen({ port: env.port, host: env.host });
