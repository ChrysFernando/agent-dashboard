import { AgentStatus, NotificationEventType, Prisma } from "@prisma/client";

import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import {
  average,
  centsToNumber,
  formatRelativeDate,
  formatSecondsAsClock,
  isSuccessfulOutcome,
  normalizeOutcome,
  safeJsonParse,
  startOfCurrentMonth,
  startOfDay,
  toMonthLabel,
} from "../lib/utils.js";
import {
  buildAgentUsageRow,
  buildAggregateTrend,
  buildAnalyticsRevenue,
  buildAverageSentiment,
  buildSpendSummary,
  buildUsageTotals,
} from "./billing.js";

async function readSnapshot<T>(key: string): Promise<T | null> {
  const snapshot = await prisma.dashboardSnapshot.findUnique({ where: { key } });
  return snapshot ? safeJsonParse<T>(snapshot.payloadJson, null as T) : null;
}

type EventWithAgent = Prisma.AgentEventGetPayload<{
  include: {
    agent: true;
  };
}>;

type KnowledgeBaseWithRelations = Prisma.KnowledgeBaseDocumentGetPayload<{
  include: {
    tags: true;
    agentLinks: true;
  };
}>;

type TranscriptSummaryRecord = Prisma.TranscriptGetPayload<{
  include: {
    agent: true;
    entries: true;
    chapters: true;
  };
}>;

type TranscriptDetailRecord = Prisma.TranscriptGetPayload<{
  include: {
    agent: true;
    entries: true;
    chapters: true;
  };
}>;

function mapAgentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sales: "Sales",
    support: "Support",
    booking: "Booking",
    coldcall: "Cold Call",
  };

  return labels[type] ?? type;
}

async function collectAgentMetrics() {
  const agents = await prisma.agent.findMany({
    include: {
      channels: true,
      knowledgeBaseLinks: {
        include: {
          knowledgeBase: {
            include: {
              tags: true,
            },
          },
        },
      },
      transcripts: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const todayStart = startOfDay();

  return agents.map((agent) => {
    const callsToday = agent.transcripts.filter((transcript) => transcript.startedAt >= todayStart).length;
    const successfulInteractions = agent.transcripts.filter((transcript) => isSuccessfulOutcome(transcript.outcome)).length;
    const conversionRate =
      agent.transcripts.length > 0 ? Number(((successfulInteractions / agent.transcripts.length) * 100).toFixed(1)) : 0;
    const avgDurationSec = average(agent.transcripts.map((transcript) => transcript.durationSec));

    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      typeLabel: mapAgentTypeLabel(agent.type),
      status: agent.status,
      avatarShape: agent.avatarShape,
      personality: agent.personality,
      language: agent.language,
      greeting: agent.greeting,
      rating: agent.rating,
      channels: agent.channels.map((channel) => channel.channel),
      knowledgeBaseIds: agent.knowledgeBaseLinks.map((link) => link.knowledgeBaseId),
      knowledgeBase: agent.knowledgeBaseLinks.map((link) => ({
        id: link.knowledgeBase.id,
        title: link.knowledgeBase.title,
        type: link.knowledgeBase.type,
        tags: link.knowledgeBase.tags.map((tag) => tag.value),
      })),
      metrics: {
        callsToday,
        conversionRate,
        avgDurationSec: Math.round(avgDurationSec),
        avgDurationLabel: formatSecondsAsClock(avgDurationSec),
        totalInteractions: agent.transcripts.length,
      },
    };
  });
}

function buildLiveFeed(events: EventWithAgent[]) {
  return events.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    summary: event.summary,
    severity: event.severity,
    occurredAt: event.occurredAt.toISOString(),
    agent: event.agent
      ? {
          id: event.agent.id,
          name: event.agent.name,
          type: event.agent.type,
        }
      : null,
  }));
}

function buildKnowledgeBaseList(documents: KnowledgeBaseWithRelations[]) {
  return documents.map((document) => ({
    id: document.id,
    title: document.title,
    type: document.type,
    tags: document.tags.map((tag) => tag.value),
    updatedAt: document.updatedAt.toISOString(),
    updatedLabel: formatRelativeDate(document.updatedAt),
    agentCount: document.agentLinks.length,
    content: document.content,
  }));
}

function buildTranscriptSummary(transcripts: TranscriptSummaryRecord[]) {
  return transcripts.map((transcript) => ({
    id: transcript.id,
    agentId: transcript.agentId,
    agentName: transcript.agent.name,
    agentType: transcript.agent.type,
    channel: transcript.channel,
    contact: transcript.contact,
    startedAt: transcript.startedAt.toISOString(),
    durationSec: transcript.durationSec,
    durationLabel: formatSecondsAsClock(transcript.durationSec),
    outcome: transcript.outcome,
    sentiment: transcript.sentiment,
    responseTimeMs: transcript.responseTimeMs,
    sentimentScore: transcript.sentimentScore,
    resolution: transcript.resolution,
    followUpRequired: transcript.followUpRequired,
    chapters: transcript.chapters
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((chapter) => chapter.label),
    preview: transcript.entries
      .slice(0, 2)
      .map((entry) => entry.text)
      .join(" "),
    threadCount: transcript.entries.length,
  }));
}

function buildTranscriptDetail(transcript: TranscriptDetailRecord) {
  return {
    id: transcript.id,
    agentId: transcript.agentId,
    agentName: transcript.agent.name,
    agentType: transcript.agent.type,
    channel: transcript.channel,
    contact: transcript.contact,
    startedAt: transcript.startedAt.toISOString(),
    durationSec: transcript.durationSec,
    durationLabel: formatSecondsAsClock(transcript.durationSec),
    outcome: transcript.outcome,
    sentiment: transcript.sentiment,
    responseTimeMs: transcript.responseTimeMs,
    sentimentScore: transcript.sentimentScore,
    resolution: transcript.resolution,
    followUpRequired: transcript.followUpRequired,
    summary: transcript.summary,
    chapters: transcript.chapters
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((chapter) => chapter.label),
    thread: transcript.entries
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((entry) => ({
        id: entry.id,
        speaker: entry.speaker,
        timestampOffsetSec: entry.timestampOffsetSec,
        text: entry.text,
      })),
  };
}

function groupTranscriptsByType(transcripts: TranscriptSummaryRecord[]) {
  return transcripts.reduce<Record<string, TranscriptSummaryRecord[]>>((accumulator, transcript) => {
    const key = transcript.agent.type;
    accumulator[key] ??= [];
    accumulator[key].push(transcript);
    return accumulator;
  }, {});
}

function percentageOf(part: number, whole: number): number {
  if (whole === 0) {
    return 0;
  }

  return Number(((part / whole) * 100).toFixed(1));
}

function buildSegmentMetrics(transcriptsByType: Record<string, Awaited<ReturnType<typeof prisma.transcript.findMany>>>) {
  const sales = transcriptsByType.sales ?? [];
  const booking = transcriptsByType.booking ?? [];
  const support = transcriptsByType.support ?? [];
  const coldcall = transcriptsByType.coldcall ?? [];

  return {
    sales: {
      conversionRate: percentageOf(
        sales.filter((transcript) => normalizeOutcome(transcript.outcome) === "converted").length,
        sales.length,
      ),
      callsToClose:
        sales.filter((transcript) => normalizeOutcome(transcript.outcome) === "converted").length > 0
          ? Number(
              (
                sales.length /
                sales.filter((transcript) => normalizeOutcome(transcript.outcome) === "converted").length
              ).toFixed(1),
            )
          : 0,
      revenueAttributed: buildAnalyticsRevenue(sales),
    },
    booking: {
      bookingsVsCalls: percentageOf(
        booking.filter((transcript) => normalizeOutcome(transcript.outcome) === "booked").length,
        booking.length,
      ),
      noShowRate: 0,
      avgTimeToBookMin: Number((average(booking.map((transcript) => transcript.durationSec)) / 60).toFixed(1)),
    },
    support: {
      firstCallResolution: percentageOf(
        support.filter((transcript) => transcript.resolution?.toLowerCase() === "yes").length,
        support.length,
      ),
      avgHandleTimeMin: Number((average(support.map((transcript) => transcript.durationSec)) / 60).toFixed(1)),
      escalationRate: percentageOf(
        support.filter((transcript) => normalizeOutcome(transcript.outcome) === "escalated").length,
        support.length,
      ),
    },
    coldcall: {
      connectRate: percentageOf(coldcall.filter((transcript) => transcript.durationSec > 0).length, coldcall.length),
      interestRate: percentageOf(
        coldcall.filter((transcript) => ["interest", "converted"].includes(normalizeOutcome(transcript.outcome) ?? ""))
          .length,
        coldcall.length,
      ),
      callbacksRequested: percentageOf(coldcall.filter((transcript) => transcript.followUpRequired).length, coldcall.length),
      dncHits: percentageOf(
        coldcall.filter((transcript) => normalizeOutcome(transcript.outcome) === "dnc").length,
        coldcall.length,
      ),
    },
  };
}

export async function getAgents() {
  return collectAgentMetrics();
}

export async function getKnowledgeBase(search?: string, type?: string) {
  const documents = await prisma.knowledgeBaseDocument.findMany({
    include: {
      tags: true,
      agentLinks: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const filtered = documents.filter((document) => {
    if (type && type !== "all" && document.type !== type) {
      return false;
    }

    if (!search) {
      return true;
    }

    const haystack = `${document.title} ${document.content} ${document.tags.map((tag) => tag.value).join(" ")}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return buildKnowledgeBaseList(filtered);
}

export async function getKnowledgeBaseDocument(documentId: string) {
  const document = await prisma.knowledgeBaseDocument.findUniqueOrThrow({
    where: { id: documentId },
    include: {
      tags: true,
      agentLinks: {
        include: {
          agent: true,
        },
      },
    },
  });

  return {
    id: document.id,
    title: document.title,
    type: document.type,
    content: document.content,
    tags: document.tags.map((tag) => tag.value),
    updatedAt: document.updatedAt.toISOString(),
    updatedLabel: formatRelativeDate(document.updatedAt),
    agents: document.agentLinks.map((link) => ({
      id: link.agent.id,
      name: link.agent.name,
      type: link.agent.type,
    })),
  };
}

export async function getTranscripts(filters: {
  agentId?: string;
  channel?: string;
  outcome?: string;
  search?: string;
}) {
  const transcripts = await prisma.transcript.findMany({
    include: {
      agent: true,
      entries: true,
      chapters: true,
    },
    orderBy: {
      startedAt: "desc",
    },
  });

  const filtered = transcripts.filter((transcript) => {
    if (filters.agentId && transcript.agentId !== filters.agentId) {
      return false;
    }

    if (filters.channel && transcript.channel !== filters.channel) {
      return false;
    }

    if (filters.outcome && normalizeOutcome(transcript.outcome) !== normalizeOutcome(filters.outcome)) {
      return false;
    }

    if (!filters.search) {
      return true;
    }

    return transcript.entries.some((entry) =>
      entry.text.toLowerCase().includes(filters.search!.toLowerCase()),
    );
  });

  return buildTranscriptSummary(filtered);
}

export async function getTranscript(transcriptId: string) {
  const transcript = await prisma.transcript.findUniqueOrThrow({
    where: { id: transcriptId },
    include: {
      agent: true,
      entries: true,
      chapters: true,
    },
  });

  return buildTranscriptDetail(transcript);
}

export async function getOverview() {
  const [agentMetrics, events, knowledgeBaseDocuments, invoices] = await Promise.all([
    collectAgentMetrics(),
    prisma.agentEvent.findMany({
      include: {
        agent: true,
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: 12,
    }),
    prisma.knowledgeBaseDocument.findMany(),
    prisma.invoice.findMany({
      orderBy: {
        issuedAt: "desc",
      },
      take: 4,
    }),
  ]);

  const transcripts = await prisma.transcript.findMany();
  const calls = await prisma.call.findMany();
  const messages = await prisma.messageEvent.findMany();
  const volume30d =
    (await readSnapshot<Array<{ day: number; label: string; voice: number; whatsapp: number }>>("overview.volume30d")) ??
    [];

  const currentUsage = buildUsageTotals({
    calls,
    transcripts,
    messages,
    knowledgeBaseDocuments,
    periodStart: startOfCurrentMonth(),
    periodEnd: new Date(),
  });

  const spendSummary = buildSpendSummary(currentUsage);
  const liveAgents = agentMetrics.filter((agent) => agent.status === AgentStatus.live).length;
  const topPerformer =
    [...agentMetrics].sort((left, right) => right.metrics.conversionRate - left.metrics.conversionRate)[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      totalInteractions: volume30d.reduce((total, day) => total + day.voice + day.whatsapp, 0),
      activeAgents: {
        live: liveAgents,
        total: agentMetrics.length,
      },
      totalSpend: centsToNumber(spendSummary.totalSpendCents),
      totalSpendCents: spendSummary.totalSpendCents,
      budget: centsToNumber(spendSummary.budgetCents),
      budgetCents: spendSummary.budgetCents,
      avgDurationSec: Math.round(spendSummary.avgDurationSec),
      avgDurationLabel: spendSummary.avgDurationLabel,
    },
    volume30d,
    liveFeed: buildLiveFeed(events),
    agents: agentMetrics,
    topPerformer,
    knowledgeBase: {
      totalDocuments: knowledgeBaseDocuments.length,
    },
    recentInvoices: invoices.map((invoice) => ({
      id: invoice.id,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt.toISOString(),
      amount: centsToNumber(invoice.amountCents),
      amountCents: invoice.amountCents,
      status: invoice.status,
    })),
  };
}

export async function getAnalytics() {
  const [transcripts, volume30d, objectionBar, issueDonut, channelDonut, csatTrend, peakHours, heatmap, scriptPerformance] =
    await Promise.all([
      prisma.transcript.findMany({
        include: {
          agent: true,
          entries: true,
          chapters: true,
        },
      }),
      readSnapshot<Array<{ day: number; label: string; voice: number; whatsapp: number }>>("overview.volume30d"),
      readSnapshot<Array<{ label: string; value: number }>>("analytics.objectionBar"),
      readSnapshot<Array<{ name: string; value: number; fill: string }>>("analytics.issueDonut"),
      readSnapshot<Array<{ name: string; value: number; fill: string }>>("analytics.channelDonut"),
      readSnapshot<Array<{ week: string; csat: number }>>("analytics.csatTrend"),
      readSnapshot<Array<{ hour: string; calls: number }>>("analytics.peakHours"),
      readSnapshot<number[][]>("analytics.heatmap"),
      readSnapshot<Array<{ name: string; connect: number; interest: number; best?: boolean; worst?: boolean }>>(
        "analytics.scriptPerformance",
      ),
    ]);

  const transcriptsByType = groupTranscriptsByType(transcripts);

  return {
    shared: {
      totalInteractions: volume30d?.reduce((total, day) => total + day.voice + day.whatsapp, 0) ?? transcripts.length,
      overallConversionRate: percentageOf(
        transcripts.filter((transcript) => isSuccessfulOutcome(transcript.outcome)).length,
        transcripts.length,
      ),
      avgSentiment: buildAverageSentiment(transcripts),
      liveCoverageHours: 24,
    },
    segments: buildSegmentMetrics(transcriptsByType),
    charts: {
      volume30d: volume30d ?? [],
      objectionBar: objectionBar ?? [],
      issueDonut: issueDonut ?? [],
      channelDonut: channelDonut ?? [],
      csatTrend: csatTrend ?? [],
      peakHours: peakHours ?? [],
      heatmap: heatmap ?? [],
      scriptPerformance:
        scriptPerformance ?? [
          { name: "Pattern Interrupt v3", connect: 38.1, interest: 14.2, best: true },
          { name: "Direct Value Prop", connect: 31.5, interest: 11.8 },
          { name: "Question-First", connect: 29, interest: 10.4 },
          { name: "Referral Mention", connect: 35.7, interest: 13.1 },
          { name: "Quick Pitch v1", connect: 22.3, interest: 7.9, worst: true },
        ],
    },
  };
}

export async function getBilling() {
  const [agents, calls, transcripts, messages, knowledgeBaseDocuments, snapshots, invoices] = await Promise.all([
    prisma.agent.findMany({
      include: {
        knowledgeBaseLinks: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
    prisma.call.findMany(),
    prisma.transcript.findMany(),
    prisma.messageEvent.findMany(),
    prisma.knowledgeBaseDocument.findMany(),
    prisma.billingUsageSnapshot.findMany({
      where: {
        workspaceId: "ws_default",
      },
      orderBy: {
        periodStart: "asc",
      },
      take: 6,
    }),
    prisma.invoice.findMany({
      where: {
        workspaceId: "ws_default",
      },
      orderBy: {
        issuedAt: "desc",
      },
      take: 6,
    }),
  ]);

  const currentUsage = buildUsageTotals({
    calls,
    transcripts,
    messages,
    knowledgeBaseDocuments,
    periodStart: startOfCurrentMonth(),
    periodEnd: new Date(),
  });
  const spendSummary = buildSpendSummary(currentUsage);

  const usageRows = agents
    .map((agent) =>
      buildAgentUsageRow({
        agent,
        calls: calls.filter((call) => call.agentId === agent.id),
        transcripts: transcripts.filter((transcript) => transcript.agentId === agent.id),
        messages: messages.filter((message) => message.agentId === agent.id),
        knowledgeBaseCount: agent.knowledgeBaseLinks.length,
      }),
    )
    .sort((left, right) => right.totalCostCents - left.totalCostCents);

  return {
    generatedAt: new Date().toISOString(),
    currentPlan: {
      name: env.billing.planName,
      fee: centsToNumber(env.billing.planFeeCents),
      feeCents: env.billing.planFeeCents,
      currency: env.billing.currency,
    },
    threshold: {
      budget: centsToNumber(env.billing.monthlyBudgetCents),
      budgetCents: env.billing.monthlyBudgetCents,
      used: centsToNumber(spendSummary.totalSpendCents),
      usedCents: spendSummary.totalSpendCents,
      remaining: centsToNumber(spendSummary.budgetRemainingCents),
      remainingCents: spendSummary.budgetRemainingCents,
      percentUsed: spendSummary.budgetUsedPercent,
    },
    currentMonth: {
      voiceAgentCost: centsToNumber(spendSummary.voiceAgentCostCents),
      voiceAgentCostCents: spendSummary.voiceAgentCostCents,
      aiAgentCost: centsToNumber(spendSummary.aiAgentCostCents),
      aiAgentCostCents: spendSummary.aiAgentCostCents,
      callCost: centsToNumber(spendSummary.callCostCents),
      callCostCents: spendSummary.callCostCents,
      totalSpend: centsToNumber(spendSummary.totalSpendCents),
      totalSpendCents: spendSummary.totalSpendCents,
      invoiceTotal: centsToNumber(spendSummary.invoiceTotalCents),
      invoiceTotalCents: spendSummary.invoiceTotalCents,
    },
    trend: buildAggregateTrend(snapshots),
    usageRows,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt.toISOString(),
      monthLabel: toMonthLabel(invoice.issuedAt),
      amount: centsToNumber(invoice.amountCents),
      amountCents: invoice.amountCents,
      status: invoice.status,
    })),
  };
}

export async function getSettings() {
  const [workspace, notifications, team, webhooks] = await Promise.all([
    prisma.workspace.findFirstOrThrow(),
    prisma.notificationRule.findMany({
      orderBy: {
        eventType: "asc",
      },
    }),
    prisma.teamMember.findMany({
      orderBy: {
        role: "asc",
      },
    }),
    prisma.webhookEndpoint.findMany({
      include: {
        events: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    }),
  ]);

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      timezone: workspace.timezone,
      defaultLanguage: workspace.defaultLanguage,
      retentionDays: workspace.retentionDays,
    },
    billing: {
      currency: env.billing.currency,
      planName: env.billing.planName,
      planFee: centsToNumber(env.billing.planFeeCents),
      planFeeCents: env.billing.planFeeCents,
      monthlyBudget: centsToNumber(env.billing.monthlyBudgetCents),
      monthlyBudgetCents: env.billing.monthlyBudgetCents,
    },
    notifications: notifications.map((rule) => ({
      id: rule.id,
      eventType: rule.eventType,
      emailEnabled: rule.emailEnabled,
      webhookEnabled: rule.webhookEnabled,
    })),
    team: team.map((member) => ({
      id: member.id,
      name: member.name,
      email: member.email,
      role: member.role,
      initials: member.initials,
      color: member.color,
    })),
    webhooks: webhooks.map((endpoint) => ({
      id: endpoint.id,
      url: endpoint.url,
      status: endpoint.status,
      description: endpoint.description,
      lastTestedAt: endpoint.lastTestedAt?.toISOString() ?? null,
      lastDeliveryAt: endpoint.lastDeliveryAt?.toISOString() ?? null,
      events: endpoint.events.map((event) => event.eventType),
    })),
  };
}

export async function updateWorkspace(input: {
  name?: string;
  timezone?: string;
  defaultLanguage?: string;
  retentionDays?: number | null;
}) {
  return prisma.workspace.update({
    where: { id: "ws_default" },
    data: {
      name: input.name,
      timezone: input.timezone,
      defaultLanguage: input.defaultLanguage,
      retentionDays: input.retentionDays,
    },
  });
}

export async function updateNotificationRule(input: {
  eventType: NotificationEventType;
  emailEnabled: boolean;
  webhookEnabled: boolean;
}) {
  return prisma.notificationRule.update({
    where: {
      workspaceId_eventType: {
        workspaceId: "ws_default",
        eventType: input.eventType,
      },
    },
    data: {
      emailEnabled: input.emailEnabled,
      webhookEnabled: input.webhookEnabled,
    },
  });
}
