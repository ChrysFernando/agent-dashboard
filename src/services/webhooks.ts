import { createHmac } from "node:crypto";

import type { AgentEvent, PrismaClient, WebhookEndpoint } from "@prisma/client";

import { createPrefixedId, safeJsonParse } from "../lib/utils.js";

function createSignature(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

function buildOutboundPayload(agentEvent: AgentEvent) {
  const payload = safeJsonParse<Record<string, unknown>>(agentEvent.payloadJson, {});

  return {
    id: agentEvent.id,
    eventType: agentEvent.eventType,
    occurredAt: agentEvent.occurredAt.toISOString(),
    processedAt: agentEvent.processedAt.toISOString(),
    summary: agentEvent.summary,
    severity: agentEvent.severity,
    payload,
  };
}

async function sendToEndpoint(endpoint: WebhookEndpoint, agentEvent: AgentEvent, prisma: PrismaClient) {
  const outboundPayload = buildOutboundPayload(agentEvent);
  const body = JSON.stringify(outboundPayload);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-aether-event": agentEvent.eventType,
  };

  if (endpoint.secret) {
    headers["x-aether-signature"] = createSignature(endpoint.secret, body);
  }

  const startedAt = performance.now();

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers,
      body,
    });

    const responseBody = await response.text();
    const durationMs = Math.round(performance.now() - startedAt);

    await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        agentEventId: agentEvent.id,
        eventType: agentEvent.eventType,
        payloadJson: body,
        status: response.ok ? "success" : "failed",
        responseStatus: response.status,
        responseBody,
        durationMs,
      },
    });

    await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { lastDeliveryAt: new Date() },
    });
  } catch (error) {
    const durationMs = Math.round(performance.now() - startedAt);

    await prisma.webhookDelivery.create({
      data: {
        endpointId: endpoint.id,
        agentEventId: agentEvent.id,
        eventType: agentEvent.eventType,
        payloadJson: body,
        status: "failed",
        responseBody: error instanceof Error ? error.message : "Unknown error",
        durationMs,
      },
    });
  }
}

export async function dispatchAgentEvent(prisma: PrismaClient, agentEvent: AgentEvent): Promise<number> {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: {
      status: "active",
      events: {
        some: {
          eventType: agentEvent.eventType,
        },
      },
    },
  });

  await Promise.all(endpoints.map((endpoint) => sendToEndpoint(endpoint, agentEvent, prisma)));
  return endpoints.length;
}

export async function sendTestWebhook(prisma: PrismaClient, endpointId: string) {
  const endpoint = await prisma.webhookEndpoint.findUnique({
    where: { id: endpointId },
  });

  if (!endpoint) {
    throw new Error(`Webhook endpoint ${endpointId} was not found.`);
  }

  const agentEvent = await prisma.agentEvent.create({
    data: {
      id: createPrefixedId("evt"),
      eventType: "webhook.test",
      summary: "Manual webhook connectivity test",
      severity: "info",
      payloadJson: JSON.stringify({
        endpointId,
        test: true,
      }),
      occurredAt: new Date(),
    },
  });

  await sendToEndpoint(endpoint, agentEvent, prisma);

  await prisma.webhookEndpoint.update({
    where: { id: endpointId },
    data: { lastTestedAt: new Date() },
  });

  return agentEvent;
}

