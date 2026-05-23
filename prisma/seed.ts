import { AdminRole, AgentStatus, AgentType, AnnouncementAudience, AnnouncementSeverity, Channel, KnowledgeBaseType, NotificationEventType, SupportTicketPriority, SupportTicketStatus, TeamRole, TranscriptSentiment, TranscriptSpeaker, WorkspaceStatus } from "@prisma/client";

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
  await prisma.supportTicketMessage.deleteMany();
  await prisma.supportTicket.deleteMany();
  await prisma.clientApiKey.deleteMany();
  await prisma.announcementTarget.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.adminUser.deleteMany();
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
  await prisma.plan.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
}

async function main() {
  const bundle = await loadDashboardSeedBundle();
  await resetDatabase();

  const planStarter = await prisma.plan.create({
    data: {
      id: "plan_starter",
      slug: "starter",
      name: "Starter",
      description: "For pilots: 1 agent, voice or whatsapp, 500 included minutes.",
      monthlyFeeCents: 14900,
      includedVoiceMinutes: 500,
      includedAiMinutes: 0,
      includedMessages: 1000,
      maxAgents: 1,
      maxKnowledgeDocuments: 10,
      isPublic: true,
      isDefault: false,
    },
  });
  const planScale = await prisma.plan.create({
    data: {
      id: "plan_scale",
      slug: "scale",
      name: "Scale",
      description: "Production teams: up to 6 agents, all channels, generous minute pool.",
      monthlyFeeCents: 89900,
      includedVoiceMinutes: 3000,
      includedAiMinutes: 1500,
      includedMessages: 25000,
      maxAgents: 6,
      maxKnowledgeDocuments: 100,
      isPublic: true,
      isDefault: true,
    },
  });
  const planEnterprise = await prisma.plan.create({
    data: {
      id: "plan_enterprise",
      slug: "enterprise",
      name: "Enterprise",
      description: "Unlimited agents, dedicated infra, custom SLAs.",
      monthlyFeeCents: 249900,
      includedVoiceMinutes: 12000,
      includedAiMinutes: 6000,
      includedMessages: 100000,
      maxAgents: null,
      maxKnowledgeDocuments: null,
      isPublic: false,
      isDefault: false,
    },
  });

  await prisma.workspace.create({
    data: {
      id: DEFAULT_WORKSPACE_ID,
      name: env.workspace.name,
      slug: "acme",
      contactName: "Lina Rojas",
      contactEmail: "ops@acme.test",
      contactPhone: "+1 415 555 0142",
      timezone: env.workspace.timezone,
      defaultLanguage: env.workspace.defaultLanguage,
      retentionDays: 90,
      status: WorkspaceStatus.active,
      monthlyBudgetCents: env.billing.monthlyBudgetCents,
      planId: planScale.id,
    },
  });

  await prisma.workspace.create({
    data: {
      id: "ws_helio",
      name: "Helio Health",
      slug: "helio-health",
      contactName: "Dr. Priya Suresh",
      contactEmail: "priya@heliohealth.test",
      contactPhone: "+1 628 555 0190",
      timezone: "America/Los_Angeles (UTC-08:00)",
      defaultLanguage: "English (US)",
      retentionDays: 365,
      status: WorkspaceStatus.active,
      monthlyBudgetCents: 1_200_000,
      planId: planEnterprise.id,
    },
  });

  await prisma.workspace.create({
    data: {
      id: "ws_orbit",
      name: "Orbit Logistics",
      slug: "orbit-logistics",
      contactName: "Marcus Webb",
      contactEmail: "marcus@orbitlogi.test",
      contactPhone: "+44 20 7946 0331",
      timezone: "Europe/London (UTC+00:00)",
      defaultLanguage: "English (UK)",
      retentionDays: 60,
      status: WorkspaceStatus.trial,
      trialEndsAt: new Date(Date.now() + 12 * 86_400_000),
      monthlyBudgetCents: 250_000,
      planId: planStarter.id,
    },
  });

  await prisma.workspace.create({
    data: {
      id: "ws_zephyr",
      name: "Zephyr Realty",
      slug: "zephyr-realty",
      contactName: "Ava Chen",
      contactEmail: "ava@zephyr.test",
      timezone: "Asia/Singapore (UTC+08:00)",
      defaultLanguage: "English (SG)",
      retentionDays: 90,
      status: WorkspaceStatus.suspended,
      suspendedReason: "Payment declined 3 cycles in a row",
      monthlyBudgetCents: 500_000,
      planId: planScale.id,
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
        workspaceId: DEFAULT_WORKSPACE_ID,
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

  await prisma.agent.create({
    data: {
      id: "agt_helio_intake",
      workspaceId: "ws_helio",
      name: "Helio Intake Bot",
      type: AgentType.booking,
      status: AgentStatus.live,
      personality: "warm clinician",
      language: "en-US",
      greeting: "Hi, I'm Mira from Helio Health. How can I help today?",
      rating: 4.8,
      channels: { create: [{ channel: Channel.voice }, { channel: Channel.whatsapp }] },
    },
  });

  await prisma.agent.create({
    data: {
      id: "agt_orbit_dispatch",
      workspaceId: "ws_orbit",
      name: "Orbit Dispatch",
      type: AgentType.support,
      status: AgentStatus.idle,
      personality: "concise dispatcher",
      language: "en-GB",
      greeting: "Orbit Logistics dispatch — how can I help?",
      rating: 4.5,
      channels: { create: [{ channel: Channel.voice }] },
    },
  });

  await prisma.agent.create({
    data: {
      id: "agt_zephyr_lead",
      workspaceId: "ws_zephyr",
      name: "Zephyr Lead Catcher",
      type: AgentType.sales,
      status: AgentStatus.paused,
      personality: "polished realtor",
      language: "en-SG",
      greeting: "Zephyr Realty here — looking to buy or rent?",
      rating: 4.2,
      channels: { create: [{ channel: Channel.whatsapp }] },
    },
  });

  for (const document of bundle.KB) {
    await prisma.knowledgeBaseDocument.create({
      data: {
        id: document.id,
        workspaceId: DEFAULT_WORKSPACE_ID,
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
          workspaceId: DEFAULT_WORKSPACE_ID,
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
        workspaceId: DEFAULT_WORKSPACE_ID,
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
            workspaceId: DEFAULT_WORKSPACE_ID,
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
        workspaceId: DEFAULT_WORKSPACE_ID,
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
        workspaceId: DEFAULT_WORKSPACE_ID,
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

  // ----- Admin users (super-admin console operators)
  const adminRoot = await prisma.adminUser.create({
    data: {
      id: "admin_root",
      email: "owner@aether.test",
      name: "Sentinel Operator",
      role: AdminRole.super_admin,
      initials: "SO",
      color: "#00d4ff",
      isActive: true,
      lastLoginAt: new Date(Date.now() - 90 * 60_000),
    },
  });
  await prisma.adminUser.create({
    data: {
      id: "admin_support",
      email: "support@aether.test",
      name: "Tariq Mensah",
      role: AdminRole.support,
      initials: "TM",
      color: "#7b61ff",
      isActive: true,
      lastLoginAt: new Date(Date.now() - 4 * 3_600_000),
    },
  });
  await prisma.adminUser.create({
    data: {
      id: "admin_billing",
      email: "billing@aether.test",
      name: "Greta Almqvist",
      role: AdminRole.billing,
      initials: "GA",
      color: "#00e5a0",
      isActive: true,
      lastLoginAt: new Date(Date.now() - 18 * 3_600_000),
    },
  });

  // ----- Audit log seed
  const auditSeeds: Array<{
    action: string;
    targetType: string;
    targetId: string;
    summary: string;
    minutesAgo: number;
  }> = [
    { action: "client.suspended", targetType: "workspace", targetId: "ws_zephyr", summary: "Suspended Zephyr Realty for payment failure", minutesAgo: 45 },
    { action: "client.created", targetType: "workspace", targetId: "ws_orbit", summary: "Provisioned Orbit Logistics trial", minutesAgo: 360 },
    { action: "plan.updated", targetType: "plan", targetId: "plan_scale", summary: "Adjusted Scale plan pricing to $899", minutesAgo: 1440 },
    { action: "announcement.published", targetType: "announcement", targetId: "ann_demo", summary: "Published platform-wide maintenance notice", minutesAgo: 120 },
    { action: "client.impersonated", targetType: "workspace", targetId: "ws_helio", summary: "Opened Helio Health portal in support mode", minutesAgo: 30 },
  ];
  for (const entry of auditSeeds) {
    await prisma.adminAuditLog.create({
      data: {
        adminId: adminRoot.id,
        action: entry.action,
        targetType: entry.targetType,
        targetId: entry.targetId,
        summary: entry.summary,
        occurredAt: new Date(Date.now() - entry.minutesAgo * 60_000),
      },
    });
  }

  // ----- Announcements
  await prisma.announcement.create({
    data: {
      id: "ann_maintenance",
      title: "Voice routing maintenance",
      body: "We're moving EU voice traffic to a new region on Saturday 02:00 UTC. Expect a brief reconnect window.",
      severity: AnnouncementSeverity.warning,
      audience: AnnouncementAudience.all,
      publishedAt: new Date(Date.now() - 2 * 3_600_000),
      createdById: adminRoot.id,
      targets: {
        create: [
          { workspaceId: DEFAULT_WORKSPACE_ID },
          { workspaceId: "ws_helio" },
          { workspaceId: "ws_orbit" },
          { workspaceId: "ws_zephyr" },
        ],
      },
    },
  });
  await prisma.announcement.create({
    data: {
      id: "ann_release",
      title: "New: WhatsApp message templates",
      body: "Bring your own approved WhatsApp templates and trigger them from any agent.",
      severity: AnnouncementSeverity.info,
      audience: AnnouncementAudience.all,
      publishedAt: new Date(Date.now() - 36 * 3_600_000),
      createdById: adminRoot.id,
      targets: {
        create: [
          { workspaceId: DEFAULT_WORKSPACE_ID },
          { workspaceId: "ws_helio" },
        ],
      },
    },
  });

  // ----- Sample API keys
  await prisma.clientApiKey.create({
    data: {
      id: "key_acme_prod",
      workspaceId: DEFAULT_WORKSPACE_ID,
      label: "Production",
      prefix: "ak_live_8tQ",
      hashedSecret: "$demo$hashed$value$1",
      scopes: "read,write",
      lastUsedAt: new Date(Date.now() - 15 * 60_000),
    },
  });
  await prisma.clientApiKey.create({
    data: {
      id: "key_acme_dev",
      workspaceId: DEFAULT_WORKSPACE_ID,
      label: "Development",
      prefix: "ak_test_2bM",
      hashedSecret: "$demo$hashed$value$2",
      scopes: "read",
      lastUsedAt: new Date(Date.now() - 26 * 3_600_000),
    },
  });

  // ----- Support tickets
  const ticketRouting = await prisma.supportTicket.create({
    data: {
      id: "tkt_routing",
      workspaceId: DEFAULT_WORKSPACE_ID,
      subject: "Voice cuts out after 30 seconds on whatsapp-bridge",
      body: "Several customers report being dropped at the 30-second mark when handed off from voice to whatsapp.",
      status: SupportTicketStatus.open,
      priority: SupportTicketPriority.high,
      openedBy: "ops@acme.test",
      assignedTo: "support@aether.test",
    },
  });
  await prisma.supportTicketMessage.createMany({
    data: [
      {
        ticketId: ticketRouting.id,
        author: "ops@acme.test",
        authorRole: "client",
        body: "Repro: place an inbound call, ask to switch to WhatsApp, and watch the call drop.",
      },
      {
        ticketId: ticketRouting.id,
        author: "Tariq Mensah",
        authorRole: "admin",
        body: "Acknowledged — pulling traces for the affected calls now.",
      },
    ],
  });

  await prisma.supportTicket.create({
    data: {
      id: "tkt_billing",
      workspaceId: "ws_helio",
      subject: "Invoice INV-0042 line item missing",
      body: "We had 1,200 voice minutes in March but the invoice only reflects 900.",
      status: SupportTicketStatus.pending,
      priority: SupportTicketPriority.normal,
      openedBy: "priya@heliohealth.test",
      assignedTo: "billing@aether.test",
    },
  });

  await prisma.supportTicket.create({
    data: {
      id: "tkt_kb",
      workspaceId: "ws_orbit",
      subject: "How do I upload PDFs to the knowledge base?",
      body: "Trying to attach our SOP PDFs to the Orbit Dispatch agent.",
      status: SupportTicketStatus.resolved,
      priority: SupportTicketPriority.low,
      openedBy: "marcus@orbitlogi.test",
      resolvedAt: new Date(Date.now() - 6 * 3_600_000),
    },
  });

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
