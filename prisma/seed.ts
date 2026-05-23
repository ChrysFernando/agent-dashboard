import { AgentStatus, AgentType, Channel, KnowledgeBaseType, NotificationEventType, TeamRole, TranscriptSentiment, TranscriptSpeaker } from "@prisma/client";

import { env } from "../src/lib/env.js";
import { prisma } from "../src/lib/prisma.js";
import {
  createPrefixedId,
  DEFAULT_WORKSPACE_ID,
  parseClockDurationToSeconds,
  parseHourMinuteDurationToSeconds,
} from "../src/lib/utils.js";
import { loadDashboardSeedBundle } from "../src/services/dashboard-bundle.js";

function parseTranscriptTimestamp(input: string): Date {
  return new Date(`${input.replace(" ", "T")}:00.000Z`);
}

function parseResponseTimeMs(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const numeric = Number(value.replace("s", ""));
  return Number.isFinite(numeric) ? Math.round(numeric * 1000) : undefined;
}

function parseRelativeWhen(reference: Date, value: string): Date {
  const normalized = value.trim().toLowerCase();

  if (normalized === "just now") {
    return reference;
  }

  const match = normalized.match(/^(\d+)([smhd])\s+ago$/);
  if (!match) {
    return reference;
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return new Date(reference.getTime() - amount * multipliers[unit]);
}

function resolveBillingYearSequence(labels: string[]) {
  const monthIndexes = labels.map((label) =>
    new Date(`${label} 1, ${new Date().getUTCFullYear()}`).getUTCMonth(),
  );
  const currentMonth = new Date().getUTCMonth();
  let year = monthIndexes[0] > currentMonth ? new Date().getUTCFullYear() - 1 : new Date().getUTCFullYear();

  return monthIndexes.map((monthIndex, index) => {
    if (index > 0 && monthIndex < monthIndexes[index - 1]) {
      year += 1;
    }

    return { monthIndex, year };
  });
}

function safeDivideToMinutes(cents: number, rateCentsPerMinute: number): number {
  if (rateCentsPerMinute <= 0) {
    return 0;
  }

  return Math.max(0, Math.round(cents / rateCentsPerMinute));
}

async function resetDatabase() {
  await prisma.webhookDelivery.deleteMany();
  await prisma.webhookEndpointEvent.deleteMany();
  await prisma.webhookEndpoint.deleteMany();
  await prisma.agentEvent.deleteMany();
  await prisma.transcriptEntry.deleteMany();
  await prisma.transcriptChapter.deleteMany();
  await prisma.messageEvent.deleteMany();
  await prisma.transcript.deleteMany();
  await prisma.call.deleteMany();
  await prisma.agentKnowledgeBase.deleteMany();
  await prisma.knowledgeBaseTag.deleteMany();
  await prisma.knowledgeBaseDocument.deleteMany();
  await prisma.agentChannel.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.billingUsageSnapshot.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.notificationRule.deleteMany();
  await prisma.workspace.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
}

async function main() {
  const bundle = await loadDashboardSeedBundle();
  await resetDatabase();

  await prisma.workspace.create({
    data: {
      id: DEFAULT_WORKSPACE_ID,
      name: env.workspace.name,
      timezone: env.workspace.timezone,
      defaultLanguage: env.workspace.defaultLanguage,
      retentionDays: 90,
    },
  });

  await prisma.notificationRule.createMany({
    data: [
      {
        workspaceId: DEFAULT_WORKSPACE_ID,
        eventType: NotificationEventType.call_completed,
        emailEnabled: true,
        webhookEnabled: true,
      },
      {
        workspaceId: DEFAULT_WORKSPACE_ID,
        eventType: NotificationEventType.agent_error,
        emailEnabled: true,
        webhookEnabled: false,
      },
      {
        workspaceId: DEFAULT_WORKSPACE_ID,
        eventType: NotificationEventType.spend_threshold,
        emailEnabled: true,
        webhookEnabled: true,
      },
    ],
  });

  await prisma.teamMember.createMany({
    data: bundle.TEAM.map((member) => ({
      id: createPrefixedId("team"),
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: member.name,
      email: member.email,
      role: member.role.toLowerCase() as TeamRole,
      initials: member.initials,
      color: member.color,
    })),
  });

  for (const agent of bundle.AGENTS) {
    await prisma.agent.create({
      data: {
        id: agent.id,
        name: agent.name,
        type: agent.type as AgentType,
        avatarShape: agent.avatarShape,
        status: agent.status as AgentStatus,
        personality: agent.personality,
        language: agent.language,
        greeting: agent.greeting,
        rating: agent.rating,
        channels: {
          create: agent.channels.map((channel) => ({
            channel: channel as Channel,
          })),
        },
      },
    });
  }

  for (const document of bundle.KB) {
    await prisma.knowledgeBaseDocument.create({
      data: {
        id: document.id,
        title: document.title,
        type:
          document.type === "FAQ"
            ? KnowledgeBaseType.faq
            : document.type === "Script"
              ? KnowledgeBaseType.script
              : document.type === "Product Info"
                ? KnowledgeBaseType.product_info
                : document.type === "Objection Handling"
                  ? KnowledgeBaseType.objection_handling
                  : KnowledgeBaseType.pricing,
        content: document.content,
        tags: {
          create: document.tags.map((value) => ({ value })),
        },
      },
    });
  }

  for (const agent of bundle.AGENTS) {
    for (const knowledgeBaseId of agent.kb ?? []) {
      await prisma.agentKnowledgeBase.create({
        data: {
          agentId: agent.id,
          knowledgeBaseId,
        },
      });
    }
  }

  for (const transcript of bundle.TRANSCRIPTS) {
    const agent = bundle.AGENTS.find((candidate) => candidate.name === transcript.agent);
    if (!agent) {
      continue;
    }

    const startedAt = parseTranscriptTimestamp(transcript.timestamp);
    const durationSec = parseClockDurationToSeconds(transcript.duration);
    const callId = transcript.channel === "voice" ? `call_${transcript.id}` : null;

    if (callId) {
      await prisma.call.create({
        data: {
          id: callId,
          agentId: agent.id,
          contact: transcript.caller,
          direction: agent.type === "coldcall" || agent.type === "sales" ? "outbound" : "inbound",
          status: normalizeCallStatus(transcript.outcome),
          outcome: transcript.outcome,
          startedAt,
          endedAt: new Date(startedAt.getTime() + durationSec * 1000),
          durationSec,
          responseTimeMs: parseResponseTimeMs(transcript.metrics.responseTime),
          sentimentScore: transcript.metrics.sentimentScore,
          resolution: transcript.metrics.resolution,
          followUpRequired: transcript.metrics.followUp?.toLowerCase() === "yes",
        },
      });
    }

    await prisma.transcript.create({
      data: {
        id: transcript.id,
        agentId: agent.id,
        channel: transcript.channel as Channel,
        contact: transcript.caller,
        callId: callId ?? undefined,
        startedAt,
        endedAt: new Date(startedAt.getTime() + durationSec * 1000),
        durationSec,
        outcome: transcript.outcome,
        sentiment: transcript.sentiment as TranscriptSentiment,
        responseTimeMs: parseResponseTimeMs(transcript.metrics.responseTime),
        sentimentScore: transcript.metrics.sentimentScore,
        resolution: transcript.metrics.resolution,
        followUpRequired: transcript.metrics.followUp?.toLowerCase() === "yes",
        summary: transcript.thread[0]?.text,
        chapters: transcript.chapters?.length
          ? {
              create: transcript.chapters.map((label, index) => ({
                label,
                sortOrder: index,
              })),
            }
          : undefined,
        entries: {
          create: transcript.thread.map((entry, index) => ({
            speaker: (entry.speaker ?? entry.who ?? "user") as TranscriptSpeaker,
            timestampOffsetSec: entry.timestampOffsetSec ?? 0,
            text: entry.text,
            sortOrder: index,
          })),
        },
      },
    });

    if (transcript.channel === "whatsapp") {
      for (const [index, entry] of transcript.thread.entries()) {
        await prisma.messageEvent.create({
          data: {
            id: `msg_${transcript.id}_${index}`,
            agentId: agent.id,
            transcriptId: transcript.id,
            direction: (entry.who ?? entry.speaker) === "user" ? "inbound" : "outbound",
            status: "delivered",
            contact: transcript.caller,
            body: entry.text,
            occurredAt: new Date(startedAt.getTime() + index * 12_000),
            threadId: transcript.id,
          },
        });
      }
    }
  }

  const now = new Date();
  for (const feedItem of bundle.FEED) {
    const agent = bundle.AGENTS.find((candidate) => candidate.name === feedItem.agent);

    await prisma.agentEvent.create({
      data: {
        id: `evt_${feedItem.id}`,
        eventType: feedItem.kind,
        summary: feedItem.text,
        severity:
          feedItem.pill.cls === "rose" ? "error" : feedItem.pill.cls === "amber" ? "warning" : "info",
        agentId: agent?.id,
        occurredAt: parseRelativeWhen(now, feedItem.when),
        payloadJson: JSON.stringify(feedItem),
      },
    });
  }

  const billingMonths = resolveBillingYearSequence(bundle.BILLING_MONTHS.map((entry) => entry.m));
  for (const [index, period] of billingMonths.entries()) {
    const costs = bundle.BILLING_MONTHS[index];
    const periodStart = new Date(Date.UTC(period.year, period.monthIndex, 1, 0, 0, 0, 0));
    const periodEnd = new Date(Date.UTC(period.year, period.monthIndex + 1, 0, 23, 59, 59, 999));

    await prisma.billingUsageSnapshot.create({
      data: {
        workspaceId: DEFAULT_WORKSPACE_ID,
        periodStart,
        periodEnd,
        label: costs.m,
        voiceMinutes: safeDivideToMinutes(Math.round(costs.voice * 100), env.billing.voiceAgentRateCentsPerMinute),
        aiMinutes: safeDivideToMinutes(Math.round(costs.ai * 100), env.billing.aiAgentRateCentsPerMinute),
        callMinutes: safeDivideToMinutes(Math.round(costs.call * 100), env.billing.callRateCentsPerMinute),
        messageCount: 0,
        transcriptMinutes: safeDivideToMinutes(
          Math.round(costs.ai * 100),
          env.billing.transcriptRateCentsPerMinute || env.billing.aiAgentRateCentsPerMinute,
        ),
        knowledgeDocumentCount: bundle.KB.length,
        knowledgeUpdateCount: 0,
      },
    });
  }

  for (const invoice of bundle.INVOICES) {
    const issuedAt = new Date(invoice.date);
    const dueAt = new Date(issuedAt.getTime() + 7 * 86_400_000);

    await prisma.invoice.create({
      data: {
        id: invoice.id,
        workspaceId: DEFAULT_WORKSPACE_ID,
        issuedAt,
        dueAt,
        amountCents: Math.round(invoice.amount * 100),
        status: invoice.status,
      },
    });
  }

  for (const endpoint of bundle.WEBHOOKS) {
    await prisma.webhookEndpoint.create({
      data: {
        id: endpoint.id,
        url: endpoint.url,
        status: endpoint.status.toLowerCase(),
        events: {
          create: endpoint.events.map((eventType) => ({
            eventType,
          })),
        },
      },
    });
  }

  await prisma.dashboardSnapshot.createMany({
    data: [
      { key: "overview.volume30d", payloadJson: JSON.stringify(bundle.VOLUME_30D) },
      { key: "analytics.objectionBar", payloadJson: JSON.stringify(bundle.OBJECTION_BAR) },
      { key: "analytics.issueDonut", payloadJson: JSON.stringify(bundle.ISSUE_DONUT) },
      { key: "analytics.channelDonut", payloadJson: JSON.stringify(bundle.CHANNEL_DONUT) },
      { key: "analytics.csatTrend", payloadJson: JSON.stringify(bundle.CSAT_TREND) },
      { key: "analytics.peakHours", payloadJson: JSON.stringify(bundle.PEAK_HOURS) },
      { key: "analytics.heatmap", payloadJson: JSON.stringify(bundle.HEATMAP) },
      {
        key: "analytics.scriptPerformance",
        payloadJson: JSON.stringify([
          { name: "Pattern Interrupt v3", connect: 38.1, interest: 14.2, best: true },
          { name: "Direct Value Prop", connect: 31.5, interest: 11.8 },
          { name: "Question-First", connect: 29, interest: 10.4 },
          { name: "Referral Mention", connect: 35.7, interest: 13.1 },
          { name: "Quick Pitch v1", connect: 22.3, interest: 7.9, worst: true },
        ]),
      },
    ],
  });

  console.log("Seed completed.");
}

function normalizeCallStatus(outcome: string): string {
  const normalized = outcome.toLowerCase();
  if (normalized.includes("no answer")) {
    return "no_answer";
  }

  if (normalized.includes("failed")) {
    return "failed";
  }

  return "completed";
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
