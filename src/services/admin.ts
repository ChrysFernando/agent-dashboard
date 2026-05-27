import { AdminRole, AnnouncementAudience, AnnouncementSeverity, Prisma, SupportTicketPriority, SupportTicketStatus, TeamRole, WorkspaceStatus } from "@prisma/client";

import { generateRandomPassword, hashPassword } from "../lib/auth.js";
import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import {
  centsToNumber,
  createPrefixedId,
  formatRelativeDate,
  startOfCurrentMonth,
} from "../lib/utils.js";
import { buildSpendSummary, buildUsageTotals } from "./billing.js";

export interface AdminContext {
  adminId?: string;
  adminEmail?: string;
}

async function recordAudit(input: {
  adminId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.adminAuditLog.create({
    data: {
      adminId: input.adminId ?? null,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      summary: input.summary,
      metadataJson: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}

async function ensureUniqueSlug(base: string): Promise<string> {
  let slug = base || createPrefixedId("client");
  let suffix = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (!existing) {
      return slug;
    }
    suffix += 1;
    slug = `${base}-${suffix}`;
  }
}

export async function listClients(filters?: { status?: WorkspaceStatus; search?: string }) {
  const workspaces = await prisma.workspace.findMany({
    where: {
      status: filters?.status,
      OR: filters?.search
        ? [
            { name: { contains: filters.search } },
            { contactEmail: { contains: filters.search } },
            { slug: { contains: filters.search } },
          ]
        : undefined,
    },
    include: {
      plan: true,
      _count: {
        select: {
          agents: true,
          knowledgeBaseDocuments: true,
          supportTickets: true,
          apiKeys: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const monthStart = startOfCurrentMonth();
  const now = new Date();

  const enriched = await Promise.all(
    workspaces.map(async (workspace) => {
      const [calls, transcripts, messages, knowledgeBaseDocuments, openTickets] = await Promise.all([
        prisma.call.findMany({ where: { workspaceId: workspace.id, startedAt: { gte: monthStart } } }),
        prisma.transcript.findMany({ where: { workspaceId: workspace.id, startedAt: { gte: monthStart } } }),
        prisma.messageEvent.findMany({ where: { workspaceId: workspace.id, occurredAt: { gte: monthStart } } }),
        prisma.knowledgeBaseDocument.findMany({ where: { workspaceId: workspace.id } }),
        prisma.supportTicket.count({ where: { workspaceId: workspace.id, status: { in: [SupportTicketStatus.open, SupportTicketStatus.pending] } } }),
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
        id: workspace.id,
        slug: workspace.slug,
        name: workspace.name,
        contactName: workspace.contactName,
        contactEmail: workspace.contactEmail,
        contactPhone: workspace.contactPhone,
        timezone: workspace.timezone,
        defaultLanguage: workspace.defaultLanguage,
        status: workspace.status,
        trialEndsAt: workspace.trialEndsAt?.toISOString() ?? null,
        suspendedReason: workspace.suspendedReason,
        monthlyBudget: centsToNumber(workspace.monthlyBudgetCents),
        monthlyBudgetCents: workspace.monthlyBudgetCents,
        createdAt: workspace.createdAt.toISOString(),
        createdLabel: formatRelativeDate(workspace.createdAt),
        plan: workspace.plan
          ? {
              id: workspace.plan.id,
              slug: workspace.plan.slug,
              name: workspace.plan.name,
              monthlyFee: centsToNumber(workspace.plan.monthlyFeeCents),
            }
          : null,
        counts: {
          agents: workspace._count.agents,
          knowledgeBaseDocuments: workspace._count.knowledgeBaseDocuments,
          supportTickets: workspace._count.supportTickets,
          openSupportTickets: openTickets,
          apiKeys: workspace._count.apiKeys,
        },
        usage: {
          voiceMinutes: usage.voiceMinutes,
          aiMinutes: usage.aiMinutes,
          callMinutes: usage.callMinutes,
          messageCount: usage.messageCount,
          interactions: usage.interactionsCount,
          totalSpend: centsToNumber(spend.totalSpendCents),
          totalSpendCents: spend.totalSpendCents,
          percentUsed: spend.budgetUsedPercent,
        },
      };
    }),
  );

  return enriched;
}

export async function getClient(workspaceId: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: workspaceId },
    include: {
      plan: true,
      teamMembers: true,
      notifications: true,
      apiKeys: true,
      agents: {
        include: { channels: true },
        orderBy: { createdAt: "asc" },
      },
      supportTickets: {
        include: { messages: true },
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: {
          agents: true,
          knowledgeBaseDocuments: true,
        },
      },
    },
  });

  return workspace;
}

export async function createClient(input: {
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  defaultLanguage?: string;
  planId?: string;
  status?: WorkspaceStatus;
  monthlyBudgetCents?: number;
  trialEndsAt?: string | null;
}, adminId?: string) {
  const slug = await ensureUniqueSlug(slugify(input.name));
  const workspace = await prisma.workspace.create({
    data: {
      id: createPrefixedId("ws"),
      name: input.name,
      slug,
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      timezone: input.timezone ?? env.workspace.timezone,
      defaultLanguage: input.defaultLanguage ?? env.workspace.defaultLanguage,
      planId: input.planId,
      status: input.status ?? WorkspaceStatus.trial,
      monthlyBudgetCents: input.monthlyBudgetCents ?? 250_000,
      trialEndsAt: input.trialEndsAt ? new Date(input.trialEndsAt) : null,
    },
  });

  await recordAudit({
    adminId,
    action: "client.created",
    targetType: "workspace",
    targetId: workspace.id,
    summary: `Created client ${workspace.name}`,
  });

  return workspace;
}

export async function updateClient(workspaceId: string, input: {
  name?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  timezone?: string;
  defaultLanguage?: string;
  retentionDays?: number | null;
  planId?: string | null;
  monthlyBudgetCents?: number;
}, adminId?: string) {
  const before = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: input as Prisma.WorkspaceUpdateInput,
  });
  await recordAudit({
    adminId,
    action: "client.updated",
    targetType: "workspace",
    targetId: workspaceId,
    summary: `Updated client ${workspace.name}`,
    metadata: { before, after: workspace },
  });
  return workspace;
}

export async function setClientStatus(workspaceId: string, status: WorkspaceStatus, reason: string | undefined, adminId?: string) {
  const workspace = await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      status,
      suspendedReason: status === WorkspaceStatus.suspended ? reason ?? "Suspended by admin" : null,
    },
  });
  await recordAudit({
    adminId,
    action: `client.${status}`,
    targetType: "workspace",
    targetId: workspaceId,
    summary:
      status === WorkspaceStatus.suspended
        ? `Suspended ${workspace.name}: ${reason ?? "no reason given"}`
        : `Set ${workspace.name} status to ${status}`,
  });
  return workspace;
}

export async function deleteClient(workspaceId: string, adminId?: string) {
  const workspace = await prisma.workspace.delete({ where: { id: workspaceId } });
  await recordAudit({
    adminId,
    action: "client.deleted",
    targetType: "workspace",
    targetId: workspaceId,
    summary: `Deleted client ${workspace.name}`,
  });
  return workspace;
}

export async function impersonateClient(workspaceId: string, adminId?: string) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const token = `imp_${createPrefixedId("tk")}`;
  await recordAudit({
    adminId,
    action: "client.impersonated",
    targetType: "workspace",
    targetId: workspaceId,
    summary: `Opened ${workspace.name} portal in support mode`,
    metadata: { token },
  });
  return {
    workspaceId,
    workspaceName: workspace.name,
    slug: workspace.slug,
    token,
    portalUrl: `/portal?ws=${workspace.id}&impersonate=${token}`,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}

export async function listPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: { monthlyFeeCents: "asc" },
    include: { _count: { select: { workspaces: true } } },
  });
  return plans.map((plan) => ({
    id: plan.id,
    slug: plan.slug,
    name: plan.name,
    description: plan.description,
    monthlyFee: centsToNumber(plan.monthlyFeeCents),
    monthlyFeeCents: plan.monthlyFeeCents,
    includedVoiceMinutes: plan.includedVoiceMinutes,
    includedAiMinutes: plan.includedAiMinutes,
    includedMessages: plan.includedMessages,
    maxAgents: plan.maxAgents,
    maxKnowledgeDocuments: plan.maxKnowledgeDocuments,
    isPublic: plan.isPublic,
    isDefault: plan.isDefault,
    clientCount: plan._count.workspaces,
    createdAt: plan.createdAt.toISOString(),
  }));
}

export async function createPlan(input: {
  name: string;
  slug?: string;
  description?: string;
  monthlyFeeCents: number;
  includedVoiceMinutes?: number;
  includedAiMinutes?: number;
  includedMessages?: number;
  maxAgents?: number | null;
  maxKnowledgeDocuments?: number | null;
  isPublic?: boolean;
  isDefault?: boolean;
}, adminId?: string) {
  const plan = await prisma.plan.create({
    data: {
      id: createPrefixedId("plan"),
      slug: input.slug ?? slugify(input.name),
      name: input.name,
      description: input.description,
      monthlyFeeCents: input.monthlyFeeCents,
      includedVoiceMinutes: input.includedVoiceMinutes ?? 0,
      includedAiMinutes: input.includedAiMinutes ?? 0,
      includedMessages: input.includedMessages ?? 0,
      maxAgents: input.maxAgents ?? null,
      maxKnowledgeDocuments: input.maxKnowledgeDocuments ?? null,
      isPublic: input.isPublic ?? true,
      isDefault: input.isDefault ?? false,
    },
  });
  await recordAudit({
    adminId,
    action: "plan.created",
    targetType: "plan",
    targetId: plan.id,
    summary: `Created plan ${plan.name}`,
  });
  return plan;
}

export async function updatePlan(planId: string, input: Partial<Omit<Prisma.PlanUpdateInput, "id">>, adminId?: string) {
  const plan = await prisma.plan.update({ where: { id: planId }, data: input });
  await recordAudit({
    adminId,
    action: "plan.updated",
    targetType: "plan",
    targetId: planId,
    summary: `Updated plan ${plan.name}`,
  });
  return plan;
}

export async function deletePlan(planId: string, adminId?: string) {
  const plan = await prisma.plan.delete({ where: { id: planId } });
  await recordAudit({
    adminId,
    action: "plan.deleted",
    targetType: "plan",
    targetId: planId,
    summary: `Deleted plan ${plan.name}`,
  });
  return plan;
}

export async function listAdmins() {
  const admins = await prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } });
  return admins.map((admin) => ({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
    initials: admin.initials,
    color: admin.color,
    isActive: admin.isActive,
    lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
    lastLoginLabel: admin.lastLoginAt ? formatRelativeDate(admin.lastLoginAt) : null,
    createdAt: admin.createdAt.toISOString(),
  }));
}

export async function inviteAdmin(input: {
  email: string;
  name: string;
  role: AdminRole;
  initials: string;
  color?: string;
}, adminId?: string) {
  const admin = await prisma.adminUser.create({
    data: {
      id: createPrefixedId("admin"),
      email: input.email,
      name: input.name,
      role: input.role,
      initials: input.initials,
      color: input.color ?? "#7b61ff",
    },
  });
  await recordAudit({
    adminId,
    action: "admin.invited",
    targetType: "admin",
    targetId: admin.id,
    summary: `Invited admin ${admin.email} as ${admin.role}`,
  });
  return admin;
}

export async function updateAdmin(adminId: string, input: { name?: string; role?: AdminRole; isActive?: boolean; color?: string }, actingAdminId?: string) {
  const admin = await prisma.adminUser.update({ where: { id: adminId }, data: input });
  await recordAudit({
    adminId: actingAdminId,
    action: "admin.updated",
    targetType: "admin",
    targetId: adminId,
    summary: `Updated admin ${admin.email}`,
  });
  return admin;
}

export async function deactivateAdmin(adminId: string, actingAdminId?: string) {
  const admin = await prisma.adminUser.update({ where: { id: adminId }, data: { isActive: false } });
  await recordAudit({
    adminId: actingAdminId,
    action: "admin.deactivated",
    targetType: "admin",
    targetId: adminId,
    summary: `Deactivated admin ${admin.email}`,
  });
  return admin;
}

export async function getAuditLog(limit = 100) {
  const entries = await prisma.adminAuditLog.findMany({
    orderBy: { occurredAt: "desc" },
    take: limit,
    include: { admin: true },
  });
  return entries.map((entry) => ({
    id: entry.id,
    action: entry.action,
    targetType: entry.targetType,
    targetId: entry.targetId,
    summary: entry.summary,
    occurredAt: entry.occurredAt.toISOString(),
    occurredLabel: formatRelativeDate(entry.occurredAt),
    admin: entry.admin
      ? {
          id: entry.admin.id,
          name: entry.admin.name,
          email: entry.admin.email,
          initials: entry.admin.initials,
          color: entry.admin.color,
        }
      : null,
  }));
}

export async function listAnnouncements() {
  const items = await prisma.announcement.findMany({
    orderBy: { publishedAt: "desc" },
    include: { targets: { include: { workspace: true } } },
  });
  return items.map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    body: announcement.body,
    severity: announcement.severity,
    audience: announcement.audience,
    publishedAt: announcement.publishedAt.toISOString(),
    publishedLabel: formatRelativeDate(announcement.publishedAt),
    expiresAt: announcement.expiresAt?.toISOString() ?? null,
    targets: announcement.targets.map((target) => ({
      workspaceId: target.workspaceId,
      workspaceName: target.workspace.name,
      acknowledgedAt: target.acknowledgedAt?.toISOString() ?? null,
    })),
    targetCount: announcement.targets.length,
    acknowledgedCount: announcement.targets.filter((target) => target.acknowledgedAt).length,
  }));
}

export async function publishAnnouncement(input: {
  title: string;
  body: string;
  severity?: AnnouncementSeverity;
  audience?: AnnouncementAudience;
  workspaceIds?: string[];
  expiresAt?: string | null;
}, adminId?: string) {
  const audience = input.audience ?? AnnouncementAudience.all;

  let workspaceIds = input.workspaceIds ?? [];
  if (workspaceIds.length === 0) {
    const filter: Prisma.WorkspaceWhereInput =
      audience === AnnouncementAudience.all
        ? {}
        : audience === AnnouncementAudience.trial
          ? { status: WorkspaceStatus.trial }
          : audience === AnnouncementAudience.active
            ? { status: WorkspaceStatus.active }
            : audience === AnnouncementAudience.suspended
              ? { status: WorkspaceStatus.suspended }
              : {};
    const workspaces = await prisma.workspace.findMany({ where: filter, select: { id: true } });
    workspaceIds = workspaces.map((workspace) => workspace.id);
  }

  const announcement = await prisma.announcement.create({
    data: {
      id: createPrefixedId("ann"),
      title: input.title,
      body: input.body,
      severity: input.severity ?? AnnouncementSeverity.info,
      audience,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdById: adminId,
      targets: {
        create: workspaceIds.map((workspaceId) => ({ workspaceId })),
      },
    },
  });

  await recordAudit({
    adminId,
    action: "announcement.published",
    targetType: "announcement",
    targetId: announcement.id,
    summary: `Published announcement: ${announcement.title}`,
    metadata: { audience, workspaceIds },
  });

  return announcement;
}

export async function retractAnnouncement(announcementId: string, adminId?: string) {
  const announcement = await prisma.announcement.delete({ where: { id: announcementId } });
  await recordAudit({
    adminId,
    action: "announcement.retracted",
    targetType: "announcement",
    targetId: announcementId,
    summary: `Retracted announcement: ${announcement.title}`,
  });
  return announcement;
}

export async function getGlobalMetrics() {
  const monthStart = startOfCurrentMonth();
  const now = new Date();

  const [workspaces, agents, calls, transcripts, messages, knowledgeBaseDocuments, invoices, openTickets, plans] =
    await Promise.all([
      prisma.workspace.findMany({ include: { plan: true } }),
      prisma.agent.findMany({ select: { id: true, status: true, workspaceId: true } }),
      prisma.call.findMany({ where: { startedAt: { gte: monthStart } } }),
      prisma.transcript.findMany({ where: { startedAt: { gte: monthStart } } }),
      prisma.messageEvent.findMany({ where: { occurredAt: { gte: monthStart } } }),
      prisma.knowledgeBaseDocument.findMany(),
      prisma.invoice.findMany({ where: { issuedAt: { gte: monthStart } } }),
      prisma.supportTicket.count({ where: { status: { in: [SupportTicketStatus.open, SupportTicketStatus.pending] } } }),
      prisma.plan.findMany(),
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

  const monthlyRecurringCents = workspaces.reduce(
    (total, workspace) => total + (workspace.plan?.monthlyFeeCents ?? 0),
    0,
  );
  const invoicedCents = invoices.reduce((total, invoice) => total + invoice.amountCents, 0);

  const statusBreakdown = workspaces.reduce<Record<string, number>>((acc, workspace) => {
    acc[workspace.status] = (acc[workspace.status] ?? 0) + 1;
    return acc;
  }, {});

  return {
    generatedAt: now.toISOString(),
    clients: {
      total: workspaces.length,
      active: statusBreakdown.active ?? 0,
      trial: statusBreakdown.trial ?? 0,
      suspended: statusBreakdown.suspended ?? 0,
      archived: statusBreakdown.archived ?? 0,
    },
    agents: {
      total: agents.length,
      live: agents.filter((agent) => agent.status === "live").length,
      paused: agents.filter((agent) => agent.status === "paused").length,
      idle: agents.filter((agent) => agent.status === "idle").length,
    },
    interactions: {
      thisMonth: usage.interactionsCount,
      voiceMinutes: usage.voiceMinutes,
      aiMinutes: usage.aiMinutes,
      messageCount: usage.messageCount,
    },
    revenue: {
      monthlyRecurring: centsToNumber(monthlyRecurringCents),
      monthlyRecurringCents,
      invoicedThisMonth: centsToNumber(invoicedCents),
      invoicedThisMonthCents: invoicedCents,
      spend: centsToNumber(spend.totalSpendCents),
      spendCents: spend.totalSpendCents,
    },
    knowledgeBase: {
      totalDocuments: knowledgeBaseDocuments.length,
    },
    support: {
      openTickets,
    },
    plans: plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      clientCount: workspaces.filter((workspace) => workspace.planId === plan.id).length,
      monthlyFee: centsToNumber(plan.monthlyFeeCents),
    })),
  };
}

export async function listSupportTickets(filters?: { workspaceId?: string; status?: SupportTicketStatus }) {
  const tickets = await prisma.supportTicket.findMany({
    where: {
      workspaceId: filters?.workspaceId,
      status: filters?.status,
    },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
      messages: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return tickets.map((ticket) => ({
    id: ticket.id,
    workspaceId: ticket.workspaceId,
    workspaceName: ticket.workspace.name,
    subject: ticket.subject,
    body: ticket.body,
    status: ticket.status,
    priority: ticket.priority,
    openedBy: ticket.openedBy,
    assignedTo: ticket.assignedTo,
    createdAt: ticket.createdAt.toISOString(),
    createdLabel: formatRelativeDate(ticket.createdAt),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    messageCount: ticket.messages.length,
  }));
}

export async function getSupportTicket(ticketId: string) {
  const ticket = await prisma.supportTicket.findUniqueOrThrow({
    where: { id: ticketId },
    include: {
      workspace: { select: { id: true, name: true, slug: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  return {
    id: ticket.id,
    workspaceId: ticket.workspaceId,
    workspaceName: ticket.workspace.name,
    subject: ticket.subject,
    body: ticket.body,
    status: ticket.status,
    priority: ticket.priority,
    openedBy: ticket.openedBy,
    assignedTo: ticket.assignedTo,
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

export async function updateTicket(ticketId: string, input: {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  assignedTo?: string | null;
}, adminId?: string) {
  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      status: input.status,
      priority: input.priority,
      assignedTo: input.assignedTo,
      resolvedAt:
        input.status === SupportTicketStatus.resolved || input.status === SupportTicketStatus.closed
          ? new Date()
          : undefined,
    },
  });
  await recordAudit({
    adminId,
    action: "ticket.updated",
    targetType: "ticket",
    targetId: ticketId,
    summary: `Updated ticket "${ticket.subject}"`,
  });
  return ticket;
}

export async function replyToTicket(ticketId: string, input: { author: string; body: string; authorRole?: string }, adminId?: string) {
  const message = await prisma.supportTicketMessage.create({
    data: {
      ticketId,
      author: input.author,
      authorRole: input.authorRole ?? "admin",
      body: input.body,
    },
  });
  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { status: SupportTicketStatus.pending, updatedAt: new Date() },
  });
  await recordAudit({
    adminId,
    action: "ticket.replied",
    targetType: "ticket",
    targetId: ticketId,
    summary: `Replied to ticket`,
  });
  return message;
}

export async function createTeamMemberForClient(
  workspaceId: string,
  input: {
    email: string;
    name: string;
    role: TeamRole;
    initials?: string;
    color?: string;
  },
  adminId?: string,
) {
  const workspace = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  const password = generateRandomPassword(16);
  const initials =
    input.initials ??
    input.name
      .split(/\s+/)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2);

  const member = await prisma.teamMember.create({
    data: {
      id: createPrefixedId("team"),
      workspaceId,
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      initials,
      color: input.color ?? "cyan",
      passwordHash: await hashPassword(password),
    },
  });

  await recordAudit({
    adminId,
    action: "team.created",
    targetType: "teamMember",
    targetId: member.id,
    summary: `Added ${member.name} (${member.email}) to ${workspace.name}`,
  });

  return {
    id: member.id,
    workspaceId: member.workspaceId,
    email: member.email,
    name: member.name,
    role: member.role,
    initials: member.initials,
    color: member.color,
    password,
  };
}

export async function resetTeamMemberPassword(memberId: string, adminId?: string) {
  const member = await prisma.teamMember.findUniqueOrThrow({
    where: { id: memberId },
    include: { workspace: { select: { name: true } } },
  });
  const password = generateRandomPassword(16);

  await prisma.teamMember.update({
    where: { id: memberId },
    data: { passwordHash: await hashPassword(password) },
  });

  // Revoke any active portal sessions so the old session can't keep using
  // the previous credentials.
  await prisma.session.deleteMany({
    where: { subjectType: "team", subjectId: memberId },
  });

  await recordAudit({
    adminId,
    action: "team.password_reset",
    targetType: "teamMember",
    targetId: memberId,
    summary: `Reset password for ${member.email} (${member.workspace.name})`,
  });

  return {
    id: member.id,
    email: member.email,
    name: member.name,
    workspaceId: member.workspaceId,
    password,
  };
}
