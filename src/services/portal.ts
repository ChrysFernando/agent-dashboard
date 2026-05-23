import { Prisma, SupportTicketPriority, SupportTicketStatus } from "@prisma/client";
import { randomBytes, createHash } from "node:crypto";

import { prisma } from "../lib/prisma.js";
import {
  centsToNumber,
  createPrefixedId,
  formatRelativeDate,
  startOfCurrentMonth,
} from "../lib/utils.js";
import { buildSpendSummary, buildUsageTotals } from "./billing.js";

export async function getPortalAccount(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: { plan: true },
  });
  return {
    id: workspace.id,
    slug: workspace.slug,
    name: workspace.name,
    contactName: workspace.contactName,
    contactEmail: workspace.contactEmail,
    contactPhone: workspace.contactPhone,
    timezone: workspace.timezone,
    defaultLanguage: workspace.defaultLanguage,
    retentionDays: workspace.retentionDays,
    status: workspace.status,
    trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
    suspendedReason: workspace.suspendedReason,
    monthlyBudget: centsToNumber(workspace.monthlyBudgetCents),
    monthlyBudgetCents: workspace.monthlyBudgetCents,
    plan: workspace.plan
      ? {
          id: workspace.plan.id,
          slug: workspace.plan.slug,
          name: workspace.plan.name,
          monthlyFee: centsToNumber(workspace.plan.monthlyFeeCents),
          includedVoiceMinutes: workspace.plan.includedVoiceMinutes,
          includedAiMinutes: workspace.plan.includedAiMinutes,
          includedMessages: workspace.plan.includedMessages,
        }
      : null,
  };
}

export async function listWorkspaces() {
  const workspaces = await prisma.workspace.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, status: true },
  });
  return workspaces;
}

export async function listApiKeys(workspaceId: string) {
  const keys = await prisma.clientApiKey.findMany({
    where: { workspaceId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return keys.map((key) => ({
    id: key.id,
    label: key.label,
    prefix: key.prefix,
    scopes: key.scopes.split(",").filter(Boolean),
    lastUsedAt: key.lastUsedAt?.toISOString() ?? null,
    lastUsedLabel: key.lastUsedAt ? formatRelativeDate(key.lastUsedAt) : null,
    createdAt: key.createdAt.toISOString(),
  }));
}

export async function createApiKey(workspaceId: string, input: { label: string; scopes?: string[] }) {
  const secret = `${randomBytes(24).toString("base64url")}`;
  const prefix = `ak_live_${secret.slice(0, 6)}`;
  const hashedSecret = createHash("sha256").update(secret).digest("hex");

  const key = await prisma.clientApiKey.create({
    data: {
      id: createPrefixedId("key"),
      workspaceId,
      label: input.label,
      prefix,
      hashedSecret,
      scopes: (input.scopes ?? ["read", "write"]).join(","),
    },
  });
  return {
    id: key.id,
    label: key.label,
    prefix,
    secret: `${prefix}.${secret}`,
    scopes: key.scopes.split(",").filter(Boolean),
    createdAt: key.createdAt.toISOString(),
  };
}

export async function revokeApiKey(keyId: string) {
  return prisma.clientApiKey.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  });
}

export async function listClientSupportTickets(workspaceId: string) {
  const tickets = await prisma.supportTicket.findMany({
    where: { workspaceId },
    include: { messages: true },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return tickets.map((ticket) => ({
    id: ticket.id,
    subject: ticket.subject,
    body: ticket.body,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    createdLabel: formatRelativeDate(ticket.createdAt),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    messageCount: ticket.messages.length,
  }));
}

export async function openSupportTicket(workspaceId: string, input: {
  subject: string;
  body: string;
  priority?: SupportTicketPriority;
  openedBy?: string;
}) {
  return prisma.supportTicket.create({
    data: {
      id: createPrefixedId("tkt"),
      workspaceId,
      subject: input.subject,
      body: input.body,
      priority: input.priority ?? SupportTicketPriority.normal,
      openedBy: input.openedBy,
      status: SupportTicketStatus.open,
    },
  });
}

export async function replyAsClient(ticketId: string, input: { author: string; body: string }) {
  await prisma.supportTicketMessage.create({
    data: {
      ticketId,
      author: input.author,
      authorRole: "client",
      body: input.body,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: SupportTicketStatus.open, updatedAt: new Date() },
  });
  return getClientSupportTicket(ticketId);
}

export async function getClientSupportTicket(ticketId: string) {
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  return {
    id: ticket.id,
    workspaceId: ticket.workspaceId,
    subject: ticket.subject,
    body: ticket.body,
    status: ticket.status,
    priority: ticket.priority,
    createdAt: ticket.createdAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    messages: ticket.messages.map((message) => ({
      id: message.id,
      author: message.author,
      authorRole: message.authorRole,
      body: message.body,
      createdAt: message.createdAt.toISOString(),
      createdLabel: formatRelativeDate(message.createdAt),
    })),
  };
}

export async function listAnnouncementsForWorkspace(workspaceId: string) {
  const targets = await prisma.announcementTarget.findMany({
    where: { workspaceId },
    include: { announcement: true },
    orderBy: { announcement: { publishedAt: "desc" } },
  });
  return targets
    .filter((target) => !target.announcement.expiresAt || target.announcement.expiresAt > new Date())
    .map((target) => ({
      id: target.announcement.id,
      title: target.announcement.title,
      body: target.announcement.body,
      severity: target.announcement.severity,
      publishedAt: target.announcement.publishedAt.toISOString(),
      publishedLabel: formatRelativeDate(target.announcement.publishedAt),
      acknowledgedAt: target.acknowledgedAt?.toISOString() ?? null,
    }));
}

export async function acknowledgeAnnouncement(workspaceId: string, announcementId: string) {
  return prisma.announcementTarget.update({
    where: {
      announcementId_workspaceId: {
        workspaceId,
        announcementId,
      },
    },
    data: { acknowledgedAt: new Date() },
  });
}

export async function getPortalUsage(workspaceId: string) {
  const monthStart = startOfCurrentMonth();
  const now = new Date();

  const [calls, transcripts, messages, knowledgeBaseDocuments, workspace, invoices] = await Promise.all([
    prisma.call.findMany({ where: { workspaceId, startedAt: { gte: monthStart } } }),
    prisma.transcript.findMany({ where: { workspaceId, startedAt: { gte: monthStart } } }),
    prisma.messageEvent.findMany({ where: { workspaceId, occurredAt: { gte: monthStart } } }),
    prisma.knowledgeBaseDocument.findMany({ where: { workspaceId } }),
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, include: { plan: true } }),
    prisma.invoice.findMany({ where: { workspaceId }, orderBy: { issuedAt: "desc" }, take: 6 }),
  ]);

  const usage = buildUsageTotals({
    calls,
    transcripts,
    messages,
    knowledgeBaseDocuments,
    periodStart: monthStart,
    periodEnd: now,
  });
  const spend = buildSpendSummary(usage);

  return {
    generatedAt: now.toISOString(),
    plan: workspace.plan
      ? { name: workspace.plan.name, monthlyFee: centsToNumber(workspace.plan.monthlyFeeCents) }
      : null,
    budget: {
      total: centsToNumber(workspace.monthlyBudgetCents),
      totalCents: workspace.monthlyBudgetCents,
      used: centsToNumber(spend.totalSpendCents),
      usedCents: spend.totalSpendCents,
      remaining: Math.max(0, centsToNumber(workspace.monthlyBudgetCents - spend.totalSpendCents)),
      percentUsed: workspace.monthlyBudgetCents
        ? Math.round((spend.totalSpendCents / workspace.monthlyBudgetCents) * 100)
        : 0,
    },
    usage,
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      issuedAt: invoice.issuedAt.toISOString(),
      dueAt: invoice.dueAt.toISOString(),
      amount: centsToNumber(invoice.amountCents),
      status: invoice.status,
    })),
  };
}
