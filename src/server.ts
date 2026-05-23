import { readFile } from "node:fs/promises";

import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { NotificationEventType } from "@prisma/client";
import { Type, type Static } from "@sinclair/typebox";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";
import Fastify from "fastify";

import { env } from "./lib/env.js";
import { prisma } from "./lib/prisma.js";
import { createPrefixedId, DEFAULT_WORKSPACE_ID } from "./lib/utils.js";
import {
  getAgents,
  getAnalytics,
  getBilling,
  getKnowledgeBase,
  getKnowledgeBaseDocument,
  getOverview,
  getSettings,
  getTranscript,
  getTranscripts,
  updateNotificationRule,
  updateWorkspace,
} from "./services/dashboard.js";
import { ingestAgentWebhook } from "./services/ingest.js";
import { sendTestWebhook } from "./services/webhooks.js";

const agentTypeSchema = Type.Union([
  Type.Literal("sales"),
  Type.Literal("support"),
  Type.Literal("booking"),
  Type.Literal("coldcall"),
]);

const agentStatusSchema = Type.Union([
  Type.Literal("live"),
  Type.Literal("paused"),
  Type.Literal("idle"),
]);

const channelSchema = Type.Union([Type.Literal("voice"), Type.Literal("whatsapp")]);

const knowledgeBaseTypeSchema = Type.Union([
  Type.Literal("faq"),
  Type.Literal("script"),
  Type.Literal("product_info"),
  Type.Literal("objection_handling"),
  Type.Literal("pricing"),
]);

const notificationEventSchema = Type.Union([
  Type.Literal("call_completed"),
  Type.Literal("agent_error"),
  Type.Literal("spend_threshold"),
]);

const app = Fastify({
  logger: true,
}).withTypeProvider<TypeBoxTypeProvider>();

await app.register(cors, {
  origin: true,
});

await app.register(swagger, {
  openapi: {
    info: {
      title: "Agent Dashboard API",
      version: "1.0.0",
      description:
        "Backend for the Aether-style agent dashboard: agents, transcripts, billing, analytics, knowledge base, and webhook ingestion.",
    },
  },
});

await app.register(swaggerUi, {
  routePrefix: "/docs",
});

app.get(
  "/health",
  {
    schema: {
      tags: ["System"],
      summary: "Health check",
    },
  },
  async () => ({
    status: "ok",
    now: new Date().toISOString(),
  }),
);

async function serveDashboardHtml() {
  return readFile(env.dashboardHtmlPath, "utf8");
}

app.get(
  "/",
  {
    schema: {
      tags: ["System"],
      summary: "Serve the original dashboard HTML",
    },
  },
  async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return serveDashboardHtml();
  },
);

app.get(
  "/dashboard",
  {
    schema: {
      tags: ["System"],
      summary: "Serve the original dashboard HTML",
    },
  },
  async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return serveDashboardHtml();
  },
);

app.get(
  "/api/overview",
  {
    schema: {
      tags: ["Dashboard"],
      summary: "Overview page data",
    },
  },
  async () => getOverview(),
);

app.get(
  "/api/analytics",
  {
    schema: {
      tags: ["Dashboard"],
      summary: "Analytics page data",
    },
  },
  async () => getAnalytics(),
);

app.get(
  "/api/billing",
  {
    schema: {
      tags: ["Billing"],
      summary: "Billing page data",
    },
  },
  async () => getBilling(),
);

app.get(
  "/api/agents",
  {
    schema: {
      tags: ["Agents"],
      summary: "List agents with computed dashboard metrics",
    },
  },
  async () => getAgents(),
);

const createAgentBody = Type.Object({
  name: Type.String({ minLength: 1 }),
  type: agentTypeSchema,
  status: Type.Optional(agentStatusSchema),
  channels: Type.Array(channelSchema, { minItems: 1 }),
  personality: Type.Optional(Type.String()),
  language: Type.Optional(Type.String()),
  greeting: Type.Optional(Type.String()),
  avatarShape: Type.Optional(Type.String()),
  rating: Type.Optional(Type.Number()),
  knowledgeBaseIds: Type.Optional(Type.Array(Type.String())),
});

type CreateAgentBody = Static<typeof createAgentBody>;

app.post(
  "/api/agents",
  {
    schema: {
      tags: ["Agents"],
      summary: "Create an agent",
      body: createAgentBody,
    },
  },
  async (request, reply) => {
    const body = request.body as CreateAgentBody;
    const agentId = createPrefixedId("agt");

    await prisma.agent.create({
      data: {
        id: agentId,
        name: body.name,
        type: body.type,
        status: body.status ?? "idle",
        personality: body.personality,
        language: body.language,
        greeting: body.greeting,
        avatarShape: body.avatarShape,
        rating: body.rating,
        channels: {
          create: body.channels.map((channel) => ({ channel })),
        },
        knowledgeBaseLinks:
          body.knowledgeBaseIds && body.knowledgeBaseIds.length > 0
            ? {
                create: body.knowledgeBaseIds.map((knowledgeBaseId) => ({ knowledgeBaseId })),
              }
            : undefined,
      },
    });

    reply.code(201);
    return prisma.agent.findUniqueOrThrow({
      where: { id: agentId },
      include: {
        channels: true,
        knowledgeBaseLinks: true,
      },
    });
  },
);

const updateAgentBody = Type.Partial(createAgentBody);
type UpdateAgentBody = Static<typeof updateAgentBody>;

app.patch(
  "/api/agents/:agentId",
  {
    schema: {
      tags: ["Agents"],
      summary: "Update an agent",
      params: Type.Object({
        agentId: Type.String(),
      }),
      body: updateAgentBody,
    },
  },
  async (request) => {
    const { agentId } = request.params;
    const body = request.body as UpdateAgentBody;

    await prisma.$transaction(async (tx) => {
      await tx.agent.update({
        where: { id: agentId },
        data: {
          name: body.name,
          type: body.type,
          status: body.status,
          personality: body.personality,
          language: body.language,
          greeting: body.greeting,
          avatarShape: body.avatarShape,
          rating: body.rating,
        },
      });

      if (body.channels) {
        await tx.agentChannel.deleteMany({ where: { agentId } });
        await tx.agentChannel.createMany({
          data: body.channels.map((channel) => ({
            agentId,
            channel,
          })),
        });
      }

      if (body.knowledgeBaseIds) {
        await tx.agentKnowledgeBase.deleteMany({ where: { agentId } });
        if (body.knowledgeBaseIds.length > 0) {
          await tx.agentKnowledgeBase.createMany({
            data: body.knowledgeBaseIds.map((knowledgeBaseId) => ({
              agentId,
              knowledgeBaseId,
            })),
          });
        }
      }
    });

    return prisma.agent.findUniqueOrThrow({
      where: { id: agentId },
      include: {
        channels: true,
        knowledgeBaseLinks: true,
      },
    });
  },
);

app.post(
  "/api/agents/:agentId/toggle",
  {
    schema: {
      tags: ["Agents"],
      summary: "Toggle or set agent status",
      params: Type.Object({
        agentId: Type.String(),
      }),
      body: Type.Optional(
        Type.Object({
          status: Type.Optional(agentStatusSchema),
        }),
      ),
    },
  },
  async (request) => {
    const { agentId } = request.params;
    const current = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
    const requestedStatus = request.body?.status;
    const nextStatus =
      requestedStatus ??
      (current.status === "live" ? "paused" : current.status === "paused" ? "live" : "live");

    return prisma.agent.update({
      where: { id: agentId },
      data: {
        status: nextStatus,
      },
    });
  },
);

app.get(
  "/api/knowledge-base",
  {
    schema: {
      tags: ["Knowledge Base"],
      summary: "List knowledge-base entries",
      querystring: Type.Object({
        search: Type.Optional(Type.String()),
        type: Type.Optional(Type.String()),
      }),
    },
  },
  async (request) => getKnowledgeBase(request.query.search, request.query.type),
);

const knowledgeBaseBody = Type.Object({
  title: Type.String({ minLength: 1 }),
  type: knowledgeBaseTypeSchema,
  content: Type.String(),
  tags: Type.Array(Type.String(), { default: [] }),
  agentIds: Type.Optional(Type.Array(Type.String())),
});

type KnowledgeBaseBody = Static<typeof knowledgeBaseBody>;

app.post(
  "/api/knowledge-base",
  {
    schema: {
      tags: ["Knowledge Base"],
      summary: "Create a knowledge-base entry",
      body: knowledgeBaseBody,
    },
  },
  async (request, reply) => {
    const body = request.body as KnowledgeBaseBody;
    const documentId = createPrefixedId("kb");

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeBaseDocument.create({
        data: {
          id: documentId,
          title: body.title,
          type: body.type,
          content: body.content,
          tags: {
            create: body.tags.map((value) => ({ value })),
          },
        },
      });

      if (body.agentIds?.length) {
        await tx.agentKnowledgeBase.createMany({
          data: body.agentIds.map((agentId) => ({
            agentId,
            knowledgeBaseId: documentId,
          })),
        });
      }
    });

    reply.code(201);
    return getKnowledgeBaseDocument(documentId);
  },
);

app.get(
  "/api/knowledge-base/:knowledgeBaseId",
  {
    schema: {
      tags: ["Knowledge Base"],
      summary: "Get a knowledge-base entry",
      params: Type.Object({
        knowledgeBaseId: Type.String(),
      }),
    },
  },
  async (request) => getKnowledgeBaseDocument(request.params.knowledgeBaseId),
);

app.put(
  "/api/knowledge-base/:knowledgeBaseId",
  {
    schema: {
      tags: ["Knowledge Base"],
      summary: "Update a knowledge-base entry",
      params: Type.Object({
        knowledgeBaseId: Type.String(),
      }),
      body: knowledgeBaseBody,
    },
  },
  async (request) => {
    const { knowledgeBaseId } = request.params;
    const body = request.body as KnowledgeBaseBody;

    await prisma.$transaction(async (tx) => {
      await tx.knowledgeBaseDocument.update({
        where: { id: knowledgeBaseId },
        data: {
          title: body.title,
          type: body.type,
          content: body.content,
        },
      });

      await tx.knowledgeBaseTag.deleteMany({ where: { knowledgeBaseId } });
      if (body.tags.length) {
        await tx.knowledgeBaseTag.createMany({
          data: body.tags.map((value) => ({
            knowledgeBaseId,
            value,
          })),
        });
      }

      if (body.agentIds) {
        await tx.agentKnowledgeBase.deleteMany({ where: { knowledgeBaseId } });
        if (body.agentIds.length) {
          await tx.agentKnowledgeBase.createMany({
            data: body.agentIds.map((agentId) => ({
              agentId,
              knowledgeBaseId,
            })),
          });
        }
      }
    });

    return getKnowledgeBaseDocument(knowledgeBaseId);
  },
);

app.delete(
  "/api/knowledge-base/:knowledgeBaseId",
  {
    schema: {
      tags: ["Knowledge Base"],
      summary: "Delete a knowledge-base entry",
      params: Type.Object({
        knowledgeBaseId: Type.String(),
      }),
    },
  },
  async (request, reply) => {
    await prisma.knowledgeBaseDocument.delete({
      where: { id: request.params.knowledgeBaseId },
    });

    reply.code(204);
    return null;
  },
);

app.get(
  "/api/transcripts",
  {
    schema: {
      tags: ["Transcripts"],
      summary: "List transcript summaries",
      querystring: Type.Object({
        agentId: Type.Optional(Type.String()),
        channel: Type.Optional(channelSchema),
        outcome: Type.Optional(Type.String()),
        search: Type.Optional(Type.String()),
      }),
    },
  },
  async (request) =>
    getTranscripts({
      agentId: request.query.agentId,
      channel: request.query.channel,
      outcome: request.query.outcome,
      search: request.query.search,
    }),
);

app.get(
  "/api/transcripts/:transcriptId",
  {
    schema: {
      tags: ["Transcripts"],
      summary: "Get a single transcript with its full thread",
      params: Type.Object({
        transcriptId: Type.String(),
      }),
    },
  },
  async (request) => getTranscript(request.params.transcriptId),
);

app.get(
  "/api/settings",
  {
    schema: {
      tags: ["Settings"],
      summary: "Get workspace, notification, team, and webhook settings",
    },
  },
  async () => getSettings(),
);

const workspaceUpdateBody = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1 })),
  timezone: Type.Optional(Type.String({ minLength: 1 })),
  defaultLanguage: Type.Optional(Type.String({ minLength: 1 })),
  retentionDays: Type.Optional(Type.Union([Type.Integer({ minimum: 1 }), Type.Null()])),
});

app.patch(
  "/api/settings/workspace",
  {
    schema: {
      tags: ["Settings"],
      summary: "Update workspace settings",
      body: workspaceUpdateBody,
    },
  },
  async (request) => updateWorkspace(request.body),
);

app.put(
  "/api/settings/notifications/:eventType",
  {
    schema: {
      tags: ["Settings"],
      summary: "Update a notification rule",
      params: Type.Object({
        eventType: notificationEventSchema,
      }),
      body: Type.Object({
        emailEnabled: Type.Boolean(),
        webhookEnabled: Type.Boolean(),
      }),
    },
  },
  async (request) =>
    updateNotificationRule({
      eventType: request.params.eventType as NotificationEventType,
      emailEnabled: request.body.emailEnabled,
      webhookEnabled: request.body.webhookEnabled,
    }),
);

const teamMemberBody = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: "email" }),
  role: Type.Union([Type.Literal("owner"), Type.Literal("admin"), Type.Literal("viewer")]),
  initials: Type.String({ minLength: 1 }),
  color: Type.String({ minLength: 1 }),
});

app.post(
  "/api/team",
  {
    schema: {
      tags: ["Settings"],
      summary: "Invite or add a team member",
      body: teamMemberBody,
    },
  },
  async (request, reply) => {
    const teamMember = await prisma.teamMember.create({
      data: {
        id: createPrefixedId("team"),
        workspaceId: DEFAULT_WORKSPACE_ID,
        ...request.body,
      },
    });

    reply.code(201);
    return teamMember;
  },
);

const webhookEndpointBody = Type.Object({
  url: Type.String({ format: "uri" }),
  secret: Type.Optional(Type.String()),
  status: Type.Optional(Type.String()),
  description: Type.Optional(Type.String()),
  events: Type.Array(Type.String(), { minItems: 1 }),
});

type WebhookEndpointBody = Static<typeof webhookEndpointBody>;

app.post(
  "/api/webhooks/endpoints",
  {
    schema: {
      tags: ["Webhooks"],
      summary: "Create an outbound webhook endpoint",
      body: webhookEndpointBody,
    },
  },
  async (request, reply) => {
    const body = request.body as WebhookEndpointBody;
    const endpointId = createPrefixedId("wh");

    await prisma.webhookEndpoint.create({
      data: {
        id: endpointId,
        url: body.url,
        secret: body.secret,
        status: body.status ?? "active",
        description: body.description,
        events: {
          create: body.events.map((eventType) => ({ eventType })),
        },
      },
    });

    reply.code(201);
    return prisma.webhookEndpoint.findUniqueOrThrow({
      where: { id: endpointId },
      include: { events: true },
    });
  },
);

app.patch(
  "/api/webhooks/endpoints/:endpointId",
  {
    schema: {
      tags: ["Webhooks"],
      summary: "Update an outbound webhook endpoint",
      params: Type.Object({
        endpointId: Type.String(),
      }),
      body: Type.Partial(webhookEndpointBody),
    },
  },
  async (request) => {
    const { endpointId } = request.params;
    const body = request.body as Partial<WebhookEndpointBody>;

    await prisma.$transaction(async (tx) => {
      await tx.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          url: body.url,
          secret: body.secret,
          status: body.status,
          description: body.description,
        },
      });

      if (body.events) {
        await tx.webhookEndpointEvent.deleteMany({ where: { endpointId } });
        await tx.webhookEndpointEvent.createMany({
          data: body.events.map((eventType) => ({
            endpointId,
            eventType,
          })),
        });
      }
    });

    return prisma.webhookEndpoint.findUniqueOrThrow({
      where: { id: endpointId },
      include: { events: true },
    });
  },
);

app.delete(
  "/api/webhooks/endpoints/:endpointId",
  {
    schema: {
      tags: ["Webhooks"],
      summary: "Delete an outbound webhook endpoint",
      params: Type.Object({
        endpointId: Type.String(),
      }),
    },
  },
  async (request, reply) => {
    await prisma.webhookEndpoint.delete({
      where: { id: request.params.endpointId },
    });

    reply.code(204);
    return null;
  },
);

app.post(
  "/api/webhooks/endpoints/:endpointId/test",
  {
    schema: {
      tags: ["Webhooks"],
      summary: "Send a test event to an outbound webhook endpoint",
      params: Type.Object({
        endpointId: Type.String(),
      }),
    },
  },
  async (request) => sendTestWebhook(prisma, request.params.endpointId),
);

const inboundWebhookBody = Type.Object({
  id: Type.Optional(Type.String()),
  eventType: Type.String({ minLength: 1 }),
  occurredAt: Type.Optional(Type.String()),
  summary: Type.Optional(Type.String()),
  severity: Type.Optional(Type.String()),
  channel: Type.Optional(channelSchema),
  dispatchWebhooks: Type.Optional(Type.Boolean()),
  contact: Type.Optional(Type.String()),
  agent: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.String()),
      name: Type.Optional(Type.String()),
      type: Type.Optional(agentTypeSchema),
      status: Type.Optional(agentStatusSchema),
      personality: Type.Optional(Type.String()),
      language: Type.Optional(Type.String()),
      greeting: Type.Optional(Type.String()),
    }),
  ),
  call: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.String()),
      direction: Type.Optional(Type.String()),
      status: Type.Optional(Type.String()),
      outcome: Type.Optional(Type.String()),
      contact: Type.Optional(Type.String()),
      startedAt: Type.Optional(Type.String()),
      endedAt: Type.Optional(Type.String()),
      durationSec: Type.Optional(Type.Number()),
      responseTimeMs: Type.Optional(Type.Number()),
      sentimentScore: Type.Optional(Type.Number()),
      resolution: Type.Optional(Type.String()),
      followUpRequired: Type.Optional(Type.Boolean()),
      metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
    }),
  ),
  message: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.String()),
      direction: Type.Optional(Type.String()),
      status: Type.Optional(Type.String()),
      body: Type.Optional(Type.String()),
      contact: Type.Optional(Type.String()),
      occurredAt: Type.Optional(Type.String()),
      threadId: Type.Optional(Type.String()),
      metadata: Type.Optional(Type.Record(Type.String(), Type.Any())),
    }),
  ),
  transcript: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.String()),
      startedAt: Type.Optional(Type.String()),
      endedAt: Type.Optional(Type.String()),
      durationSec: Type.Optional(Type.Number()),
      outcome: Type.Optional(Type.String()),
      sentiment: Type.Optional(Type.Union([Type.Literal("pos"), Type.Literal("neu"), Type.Literal("neg")])),
      responseTimeMs: Type.Optional(Type.Number()),
      sentimentScore: Type.Optional(Type.Number()),
      resolution: Type.Optional(Type.String()),
      followUpRequired: Type.Optional(Type.Boolean()),
      summary: Type.Optional(Type.String()),
      chapters: Type.Optional(Type.Array(Type.String())),
      thread: Type.Optional(
        Type.Array(
          Type.Object({
            speaker: Type.Optional(Type.Union([Type.Literal("agent"), Type.Literal("user"), Type.Literal("system")])),
            who: Type.Optional(Type.Union([Type.Literal("agent"), Type.Literal("user"), Type.Literal("system")])),
            timestampOffsetSec: Type.Optional(Type.Number()),
            text: Type.String(),
          }),
        ),
      ),
    }),
  ),
  knowledgeBase: Type.Optional(
    Type.Object({
      id: Type.Optional(Type.String()),
      action: Type.Optional(Type.Union([Type.Literal("create"), Type.Literal("update"), Type.Literal("delete")])),
      title: Type.Optional(Type.String()),
      type: Type.Optional(knowledgeBaseTypeSchema),
      content: Type.Optional(Type.String()),
      tags: Type.Optional(Type.Array(Type.String())),
      attachToAgent: Type.Optional(Type.Boolean()),
    }),
  ),
});

app.post(
  "/api/webhooks/agent-events",
  {
    schema: {
      tags: ["Webhooks"],
      summary: "Inbound webhook for agent activity: calls, transcripts, messages, and knowledge-base changes",
      body: inboundWebhookBody,
    },
  },
  async (request) => {
    if (env.inboundWebhookSecret) {
      const provided = request.headers["x-aether-secret"];
      if (provided !== env.inboundWebhookSecret) {
        replyUnauthorized();
      }
    }

    return ingestAgentWebhook(request.body);
  },
);

function replyUnauthorized(): never {
  const error = new Error("Invalid x-aether-secret header.");
  (error as Error & { statusCode?: number }).statusCode = 401;
  throw error;
}

app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode ?? 500).send({
    message: error.message,
  });
});

await prisma.$connect();

app.addHook("onClose", async () => {
  await prisma.$disconnect();
});

await app.listen({
  port: env.port,
  host: env.host,
});
