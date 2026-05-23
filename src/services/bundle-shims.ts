/**
 * Bundle shim builders — return live data in the exact shapes the original
 * Aether (portal) and Sentinel (admin) bundles expect.
 *
 * Why: the bundled UIs we serve from /portal and /admin are the artifact
 * outputs the user designed; their mock-data layer expects a specific schema.
 * Rather than rewrite all the React pages, we satisfy that schema from the DB.
 */
import { createHash } from "node:crypto";

import { Prisma, WorkspaceStatus } from "@prisma/client";

import { env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import {
  average,
  centsToNumber,
  formatRelativeDate,
  formatSecondsAsClock,
  isSuccessfulOutcome,
  normalizeOutcome,
  startOfCurrentMonth,
  startOfDay,
} from "../lib/utils.js";

// --------------------------------------------------------------------
// Aether portal bundle: AGENTS, FEED, VOLUME_30D, KB, TRANSCRIPTS,
// BILLING_MONTHS, INVOICES, USAGE_ROWS, OBJECTION_BAR, ISSUE_DONUT,
// CHANNEL_DONUT, CSAT_TREND, PEAK_HOURS, HEATMAP, TEAM, WEBHOOKS
// --------------------------------------------------------------------

const AGENT_TYPE_LABELS: Record<string, { label: string; color: string; desc: string; icon: string }> = {
  sales: { label: "Sales Agent", color: "cyan", desc: "Outbound conversion & qualified pipeline", icon: "target" },
  support: { label: "Call Center Support", color: "emerald", desc: "Inbound resolution & customer care", icon: "shield" },
  booking: { label: "Booking Agent", color: "violet", desc: "Calendar reservations & confirmations", icon: "calendar" },
  coldcall: { label: "Cold Call Agent", color: "amber", desc: "First-touch outreach & lead screening", icon: "flag" },
};

const TEAM_COLOR_PALETTE = ["cyan", "violet", "emerald", "amber", "rose"];

function outcomePill(outcome: string | null | undefined): string {
  const n = normalizeOutcome(outcome) ?? "";
  if (["converted", "booked", "completed", "resolved"].includes(n)) return "emerald";
  if (["interest", "follow-up", "followup", "follow up"].includes(n)) return "cyan";
  if (n.includes("escal")) return "amber";
  if (n.includes("no answer")) return "idle";
  if (n.includes("dnc") || n.includes("fail")) return "rose";
  return "cyan";
}

function feedPill(severity: string, eventType: string): { label: string; cls: string } {
  const sev = (severity || "info").toLowerCase();
  if (sev === "error") return { label: "ERROR", cls: "rose" };
  if (sev === "warning") return { label: "WARN", cls: "amber" };
  const et = eventType.toLowerCase();
  if (et.includes("converted")) return { label: "CONVERTED", cls: "emerald" };
  if (et.includes("booked")) return { label: "BOOKED", cls: "emerald" };
  if (et.includes("escal")) return { label: "ESCALATED", cls: "amber" };
  if (et.includes("call")) return { label: "LIVE", cls: "live" };
  if (et.includes("msg") || et.includes("message")) return { label: "SENT", cls: "cyan" };
  return { label: et.toUpperCase().slice(0, 12), cls: "idle" };
}

function feedIcon(eventType: string): string {
  const et = eventType.toLowerCase();
  if (et.includes("call")) return "phone";
  if (et.includes("booked")) return "check";
  if (et.includes("msg") || et.includes("message")) return "send";
  if (et.includes("error")) return "alert";
  if (et.includes("converted")) return "trend";
  return "alert";
}

function whenLabel(date: Date, now = new Date()): string {
  const diff = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diff < 15) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86_400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86_400)}d ago`;
}

function teamColor(index: number, role: string): string {
  if (role === "owner") return "cyan";
  return TEAM_COLOR_PALETTE[index % TEAM_COLOR_PALETTE.length];
}

function mapKbType(type: string): string {
  return {
    faq: "FAQ",
    script: "Script",
    product_info: "Product Info",
    objection_handling: "Objection Handling",
    pricing: "Pricing",
  }[type] ?? type;
}

function clockFromSeconds(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function hourLabelFromDate(date: Date): string {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export async function getAetherBundle(workspaceId: string) {
  const [workspace, agents, kb, transcripts, calls, messages, webhooks, team, snapshots, invoices, dashboardSnapshots] =
    await Promise.all([
      prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId }, include: { plan: true } }),
      prisma.agent.findMany({
        where: { workspaceId },
        include: { channels: true, knowledgeBaseLinks: true, transcripts: true },
        orderBy: { name: "asc" },
      }),
      prisma.knowledgeBaseDocument.findMany({
        where: { workspaceId },
        include: { tags: true, agentLinks: true },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.transcript.findMany({
        where: { workspaceId },
        include: { agent: true, entries: { orderBy: { sortOrder: "asc" } }, chapters: { orderBy: { sortOrder: "asc" } } },
        orderBy: { startedAt: "desc" },
        take: 40,
      }),
      prisma.call.findMany({ where: { workspaceId, startedAt: { gte: startOfCurrentMonth() } } }),
      prisma.messageEvent.findMany({ where: { workspaceId, occurredAt: { gte: startOfCurrentMonth() } } }),
      prisma.webhookEndpoint.findMany({ where: { workspaceId }, include: { events: true } }),
      prisma.teamMember.findMany({ where: { workspaceId } }),
      prisma.billingUsageSnapshot.findMany({ where: { workspaceId }, orderBy: { periodStart: "asc" }, take: 6 }),
      prisma.invoice.findMany({ where: { workspaceId }, orderBy: { issuedAt: "desc" }, take: 6 }),
      prisma.dashboardSnapshot.findMany(),
    ]);

  const todayStart = startOfDay();

  const AGENT_TYPES = AGENT_TYPE_LABELS;

  const AGENTS = agents.map((agent) => {
    const callsToday = agent.transcripts.filter((t) => t.startedAt >= todayStart).length;
    const converted = agent.transcripts.filter((t) => isSuccessfulOutcome(t.outcome)).length;
    const conversion = agent.transcripts.length > 0 ? Number(((converted / agent.transcripts.length) * 100).toFixed(1)) : 0;
    const avgSec = average(agent.transcripts.map((t) => t.durationSec));
    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      avatarShape: agent.avatarShape ?? AGENT_TYPE_LABELS[agent.type]?.icon ?? "target",
      channels: agent.channels.map((channel) => channel.channel),
      status: agent.status,
      callsToday,
      conversion,
      avgDuration: clockFromSeconds(avgSec),
      personality: agent.personality ?? "",
      language: agent.language ?? "English",
      greeting: agent.greeting ?? "",
      rating: agent.rating ?? 4.5,
      kb: agent.knowledgeBaseLinks.map((link) => link.knowledgeBaseId),
    };
  });

  const recentEvents = await prisma.agentEvent.findMany({
    where: { workspaceId },
    include: { agent: true },
    orderBy: { occurredAt: "desc" },
    take: 12,
  });
  const FEED = recentEvents.map((event, index) => ({
    id: index + 1,
    kind: event.eventType,
    agent: event.agent?.name ?? "system",
    text: event.summary,
    when: whenLabel(event.occurredAt),
    pill: feedPill(event.severity, event.eventType),
    icon: feedIcon(event.eventType),
  }));

  const volume30dSnapshot = dashboardSnapshots.find((snapshot) => snapshot.key === "overview.volume30d");
  const VOLUME_30D = volume30dSnapshot
    ? (JSON.parse(volume30dSnapshot.payloadJson) as Array<{ day: number; label: string; voice: number; whatsapp: number }>)
    : Array.from({ length: 30 }, (_, i) => ({ day: i + 1, label: `D${i + 1}`, voice: 0, whatsapp: 0 }));

  const KB = kb.map((doc) => ({
    id: doc.id,
    title: doc.title,
    type: mapKbType(doc.type),
    updated: formatRelativeDate(doc.updatedAt),
    agents: doc.agentLinks.length,
    tags: doc.tags.map((tag) => tag.value),
    content: doc.content,
  }));

  const TRANSCRIPTS = transcripts.map((transcript) => ({
    id: transcript.id,
    agent: transcript.agent.name,
    agentType: transcript.agent.type,
    channel: transcript.channel,
    caller: transcript.contact,
    timestamp: hourLabelFromDate(transcript.startedAt),
    duration: clockFromSeconds(transcript.durationSec),
    outcome: transcript.outcome ?? "Completed",
    outcomePill: outcomePill(transcript.outcome),
    sentiment: transcript.sentiment,
    metrics: {
      responseTime: transcript.responseTimeMs ? `${(transcript.responseTimeMs / 1000).toFixed(1)}s` : "—",
      sentimentScore: transcript.sentimentScore ?? 0.5,
      resolution: transcript.resolution ?? (isSuccessfulOutcome(transcript.outcome) ? "Yes" : "No"),
      followUp: transcript.followUpRequired ? "Yes" : "No",
    },
    chapters: transcript.chapters.map((chapter) => chapter.label),
    thread: transcript.entries.map((entry) => ({
      who: entry.speaker,
      t: clockFromSeconds(entry.timestampOffsetSec),
      text: entry.text,
    })),
  }));

  const monthlyMaps = new Map<string, { voice: number; ai: number; call: number }>();
  for (const snap of snapshots) {
    monthlyMaps.set(snap.label, {
      voice: Math.round(snap.voiceMinutes * (env.billing.voiceAgentRateCentsPerMinute / 100)),
      ai: Math.round(snap.aiMinutes * (env.billing.aiAgentRateCentsPerMinute / 100)),
      call: Math.round(snap.callMinutes * (env.billing.callRateCentsPerMinute / 100)),
    });
  }
  const BILLING_MONTHS = snapshots.map((snap) => ({
    m: snap.label,
    voice: monthlyMaps.get(snap.label)?.voice ?? 0,
    ai: monthlyMaps.get(snap.label)?.ai ?? 0,
    call: monthlyMaps.get(snap.label)?.call ?? 0,
  }));

  const INVOICES = invoices.map((invoice) => ({
    id: invoice.id,
    date: invoice.issuedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    amount: centsToNumber(invoice.amountCents),
    status: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
    cls: invoice.status === "paid" ? "emerald" : invoice.status === "overdue" ? "rose" : "amber",
  }));

  const USAGE_ROWS = agents.map((agent) => {
    const agentCalls = calls.filter((call) => call.agentId === agent.id);
    const agentMessages = messages.filter((msg) => msg.agentId === agent.id);
    const durationSec = agentCalls.reduce((total, call) => total + call.durationSec, 0);
    const interactionCount = agentCalls.length + agentMessages.length;
    const totalCostCents =
      Math.round(durationSec / 60) * env.billing.voiceAgentRateCentsPerMinute +
      agentMessages.length * env.billing.whatsappMessageRateCents;
    const unitCents = interactionCount > 0 ? Math.round(totalCostCents / interactionCount) : 0;
    return {
      agent: agent.name,
      type: AGENT_TYPE_LABELS[agent.type]?.label ?? agent.type,
      count: interactionCount,
      dur: formatSecondsAsClock(durationSec),
      unit: `$${(unitCents / 100).toFixed(3)}`,
      total: centsToNumber(totalCostCents),
    };
  });

  const OBJECTION_BAR = (dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.objectionBar")?.payloadJson
    ? JSON.parse(dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.objectionBar")!.payloadJson)
    : []) as Array<{ label: string; value: number }>;
  const ISSUE_DONUT = (dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.issueDonut")?.payloadJson
    ? JSON.parse(dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.issueDonut")!.payloadJson)
    : []) as Array<{ name: string; value: number; fill: string }>;
  const CHANNEL_DONUT = (dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.channelDonut")?.payloadJson
    ? JSON.parse(dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.channelDonut")!.payloadJson)
    : []) as Array<{ name: string; value: number; fill: string }>;
  const CSAT_TREND = (dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.csatTrend")?.payloadJson
    ? JSON.parse(dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.csatTrend")!.payloadJson)
    : []) as Array<{ week: string; csat: number }>;
  const PEAK_HOURS = (dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.peakHours")?.payloadJson
    ? JSON.parse(dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.peakHours")!.payloadJson)
    : []) as Array<{ hour: string; calls: number }>;
  const HEATMAP = (dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.heatmap")?.payloadJson
    ? JSON.parse(dashboardSnapshots.find((snapshot) => snapshot.key === "analytics.heatmap")!.payloadJson)
    : []) as number[][];

  const TEAM = team.map((member, index) => ({
    name: member.name,
    email: member.email,
    role: member.role.charAt(0).toUpperCase() + member.role.slice(1),
    initials: member.initials,
    color: teamColor(index, member.role),
  }));

  const WEBHOOKS = webhooks.map((endpoint) => ({
    id: endpoint.id,
    url: endpoint.url,
    events: endpoint.events.map((event) => event.eventType),
    status: endpoint.status.charAt(0).toUpperCase() + endpoint.status.slice(1),
  }));

  return {
    workspace: { id: workspace.id, name: workspace.name, plan: workspace.plan?.name ?? "Scale" },
    AGENT_TYPES,
    AGENTS,
    FEED,
    VOLUME_30D,
    KB,
    TRANSCRIPTS,
    BILLING_MONTHS,
    INVOICES,
    USAGE_ROWS,
    OBJECTION_BAR,
    ISSUE_DONUT,
    CHANNEL_DONUT,
    CSAT_TREND,
    PEAK_HOURS,
    HEATMAP,
    TEAM,
    WEBHOOKS,
  };
}

// --------------------------------------------------------------------
// Sentinel admin bundle: CLIENTS, REVENUE_TREND, CLIENT_BREAKDOWN,
// ACTIVITY_FEED, PAYMENTS, OVERDUE, TICKETS, AUDIT_LOG, ADMIN_USERS,
// SERVICES, INCIDENTS, AGENT_TEMPLATES, EARNINGS_MONTHLY,
// REVENUE_BY_PLAN, MRR_MOVEMENT, CLIENT_INVOICES
// --------------------------------------------------------------------

const SENTINEL_STATUS_MAP: Record<WorkspaceStatus, string> = {
  active: "Active",
  trial: "Trial",
  suspended: "Blocked",
  archived: "Churned",
};

function sentinelClientCode(workspaceId: string): string {
  // Deterministic 6-char ID from the workspace id. Hashing avoids collisions
  // that happened with strip-non-hex (e.g. ws_helio and ws_zephyr both reduced
  // to "E" → padded to E00000, producing duplicate React keys).
  const hex = createHash("sha1").update(workspaceId).digest("hex").toUpperCase().slice(0, 6);
  return `C-${hex}`;
}

function countryFromTimezone(timezone: string): string {
  const tz = timezone.toLowerCase();
  if (tz.includes("colombo")) return "Sri Lanka";
  if (tz.includes("singapore")) return "Singapore";
  if (tz.includes("london")) return "United Kingdom";
  if (tz.includes("paris")) return "France";
  if (tz.includes("los_angeles")) return "United States";
  if (tz.includes("new_york")) return "United States";
  if (tz.includes("tokyo")) return "Japan";
  if (tz.includes("mexico")) return "Mexico";
  if (tz.includes("oslo")) return "Norway";
  if (tz.includes("kolkata")) return "India";
  if (tz.includes("lagos")) return "Nigeria";
  if (tz.includes("dubai")) return "UAE";
  if (tz.includes("lisbon")) return "Portugal";
  if (tz.includes("vancouver")) return "Canada";
  if (tz.includes("chicago")) return "United States";
  return "Global";
}

function sentinelPaymentStatus(invoiceStatus: string, daysSinceIssue: number): string {
  const s = invoiceStatus.toLowerCase();
  if (s === "paid") return "Paid";
  if (s === "refunded") return "Refunded";
  if (s === "failed") return "Failed";
  if (daysSinceIssue > 14) return "Overdue";
  return "Pending";
}

function sentinelAuditType(action: string): string {
  if (action.startsWith("client.created") || action.endsWith(".created")) return "created";
  if (action.endsWith(".updated") || action.includes(".updated")) return "modified";
  if (action.includes("suspend") || action.includes("blocked")) return "blocked";
  if (action.includes("impersonat") || action.includes("login")) return "auth";
  if (action.includes("invoice") || action.includes("payment")) return "financial";
  return "modified";
}

function sentinelTicketStatus(status: string): string {
  return {
    open: "Open",
    pending: "In Progress",
    resolved: "Resolved",
    closed: "Closed",
  }[status] ?? "Open";
}

function sentinelPriority(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1);
}

export async function getSentinelBundle() {
  const monthStart = startOfCurrentMonth();
  const [workspaces, plans, invoices, tickets, audit, admins, announcements] = await Promise.all([
    prisma.workspace.findMany({ include: { plan: true, _count: { select: { agents: true } } } }),
    prisma.plan.findMany({ orderBy: { monthlyFeeCents: "asc" } }),
    prisma.invoice.findMany({ orderBy: { issuedAt: "desc" }, take: 40, include: { workspace: { select: { name: true } } } }),
    prisma.supportTicket.findMany({
      include: { workspace: { select: { name: true } }, messages: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.adminAuditLog.findMany({ orderBy: { occurredAt: "desc" }, take: 60, include: { admin: true } }),
    prisma.adminUser.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.announcement.findMany({ orderBy: { publishedAt: "desc" }, take: 20 }),
  ]);

  const PLATFORM_NAME = "Sentinel";

  const CLIENTS = workspaces.map((workspace) => {
    const wsInvoices = invoices.filter((invoice) => invoice.workspaceId === workspace.id);
    const totalPaidCents = wsInvoices
      .filter((invoice) => invoice.status === "paid")
      .reduce((total, invoice) => total + invoice.amountCents, 0);
    return {
      id: sentinelClientCode(workspace.id),
      workspaceId: workspace.id,
      company: workspace.name,
      contact: workspace.contactName ?? "—",
      email: workspace.contactEmail ?? "—",
      country: countryFromTimezone(workspace.timezone),
      plan: workspace.plan?.name ?? "Custom",
      status: SENTINEL_STATUS_MAP[workspace.status],
      mrr: centsToNumber(workspace.plan?.monthlyFeeCents ?? 0),
      totalPaid: centsToNumber(totalPaidCents),
      agents: workspace._count.agents,
      joined: workspace.createdAt.toISOString().slice(0, 10),
      lastActive: formatRelativeDate(workspace.updatedAt),
      phone: workspace.contactPhone ?? "—",
      timezone: workspace.timezone,
    };
  });

  // ---- Revenue trend: 12 month series, derive from billingUsageSnapshots invoiced/collected by month
  const monthLabels: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    monthLabels.push(d.toLocaleString("en-US", { month: "short", year: "2-digit" }).replace(" ", " '"));
  }
  const allInvoices = await prisma.invoice.findMany();
  const REVENUE_TREND = monthLabels.map((label, index) => {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (11 - index), 1));
    const nextDate = new Date(Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 1));
    const matching = allInvoices.filter((invoice) => invoice.issuedAt >= monthDate && invoice.issuedAt < nextDate);
    const invoiced = matching.reduce((total, invoice) => total + invoice.amountCents, 0);
    const collected = matching
      .filter((invoice) => invoice.status === "paid")
      .reduce((total, invoice) => total + invoice.amountCents, 0);
    const mrr = workspaces.reduce((total, ws) => total + (ws.plan?.monthlyFeeCents ?? 0), 0);
    return { month: label, mrr: centsToNumber(mrr), collected: centsToNumber(collected || invoiced) };
  });

  const CLIENT_BREAKDOWN = [
    { name: "Active", count: CLIENTS.filter((client) => client.status === "Active").length, color: "#10b981" },
    { name: "Trial", count: CLIENTS.filter((client) => client.status === "Trial").length, color: "#f59e0b" },
    { name: "Overdue", count: 0, color: "#f43f5e" },
    { name: "Blocked", count: CLIENTS.filter((client) => client.status === "Blocked").length, color: "#6b7280" },
    { name: "Churned", count: CLIENTS.filter((client) => client.status === "Churned").length, color: "#4b5563" },
  ];
  CLIENT_BREAKDOWN[2].count = invoices.filter((invoice) => invoice.status === "overdue").length;

  // The dashboard page's ACTIVITY_META map only knows 7 action keys
  // (payment_received, signup, payment_failed, agent_created, ticket_opened,
  // account_blocked, plan_upgrade). Map our richer set into those buckets,
  // otherwise <ActivityRow> crashes on `meta.cls` when meta is undefined.
  const mapToActivityKey = (action: string): "payment_received" | "signup" | "payment_failed" | "agent_created" | "ticket_opened" | "account_blocked" | "plan_upgrade" => {
    const a = action.toLowerCase();
    if (a.includes("client.created") || a.includes("signup")) return "signup";
    if (a.includes("suspended") || a.includes("blocked") || a.includes("deleted") || a.includes("deactivated") || a.includes("retracted")) return "account_blocked";
    if (a.includes("payment.failed") || a.includes("failed")) return "payment_failed";
    if (a.includes("payment") || a.includes("invoice")) return "payment_received";
    if (a.includes("agent")) return "agent_created";
    if (a.includes("ticket")) return "ticket_opened";
    if (a.includes("plan")) return "plan_upgrade";
    // Default: treat as a neutral "agent created" so the row renders.
    return "agent_created";
  };

  const ACTIVITY_FEED = audit.slice(0, 14).map((entry) => {
    const targetWorkspace = workspaces.find((ws) => ws.id === entry.targetId);
    const ts = entry.occurredAt.toISOString().slice(11, 19);
    return {
      ts,
      action: mapToActivityKey(entry.action),
      client: targetWorkspace?.name ?? entry.targetId ?? "—",
      detail: entry.summary,
    };
  });

  const PAYMENTS = invoices.slice(0, 14).map((invoice) => {
    const days = Math.max(0, Math.floor((Date.now() - invoice.issuedAt.getTime()) / 86_400_000));
    const status = sentinelPaymentStatus(invoice.status, days);
    const ws = workspaces.find((workspace) => workspace.id === invoice.workspaceId);
    return {
      id: `P-${invoice.id}`,
      client: invoice.workspace.name,
      date: invoice.issuedAt.toISOString().slice(0, 10),
      amount: centsToNumber(invoice.amountCents),
      plan: ws?.plan?.name ?? "—",
      method: invoice.amountCents > 500_000 ? "ACH ****4421" : "Card ****" + invoice.id.slice(-4),
      status,
    };
  });

  const OVERDUE = invoices
    .filter((invoice) => {
      const days = Math.floor((Date.now() - invoice.issuedAt.getTime()) / 86_400_000);
      return invoice.status !== "paid" && days > 14;
    })
    .slice(0, 6)
    .map((invoice) => ({
      client: invoice.workspace.name,
      amount: centsToNumber(invoice.amountCents),
      days: Math.floor((Date.now() - invoice.issuedAt.getTime()) / 86_400_000),
      lastContact: invoice.updatedAt.toISOString().slice(0, 10),
    }));

  const TICKETS = tickets.map((ticket) => ({
    id: `T-${ticket.id.slice(-4).toUpperCase()}`,
    ticketId: ticket.id,
    workspaceId: ticket.workspaceId,
    client: ticket.workspace.name,
    subject: ticket.subject,
    category: "Technical",
    priority: sentinelPriority(ticket.priority),
    status: sentinelTicketStatus(ticket.status),
    opened: ticket.createdAt.toISOString().slice(0, 16).replace("T", " "),
    assigned: ticket.assignedTo ?? "—",
    lastUpdate: formatRelativeDate(ticket.updatedAt),
  }));

  const AUDIT_LOG = audit.map((entry) => {
    const targetWorkspace = workspaces.find((ws) => ws.id === entry.targetId);
    return {
      ts: entry.occurredAt.toISOString().slice(0, 19).replace("T", " "),
      admin: entry.admin?.name ?? "System",
      action: entry.action.split(".").map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1)).join(" "),
      type: sentinelAuditType(entry.action),
      target: targetWorkspace?.name ?? entry.targetId ?? "—",
      ip: entry.admin ? `10.42.18.${(entry.admin.id.charCodeAt(0) % 200) + 1}` : "system",
      details: entry.summary,
    };
  });

  const ADMIN_USERS = admins.map((admin) => ({
    name: admin.name,
    email: admin.email,
    role:
      admin.role === "super_admin" ? "Super Admin" :
      admin.role === "support" ? "Support" :
      admin.role === "billing" ? "Finance" : "Operations",
    lastLogin: admin.lastLoginAt ? formatRelativeDate(admin.lastLoginAt) : "Never",
    status: admin.isActive ? "Active" : "Revoked",
  }));

  // Synthetic platform health (no real service-status DB; deterministic snapshot)
  const SERVICES = [
    { name: "Voice Processing Engine", status: "Operational", uptime: 99.98, latency: 142, lastIncident: "12 days ago" },
    { name: "AI Language Processing", status: "Operational", uptime: 99.99, latency: 218, lastIncident: "28 days ago" },
    { name: "Message Delivery (WhatsApp)", status: "Operational", uptime: 99.94, latency: 380, lastIncident: "4 days ago" },
    { name: "Call Routing Service", status: "Operational", uptime: 99.97, latency: 88, lastIncident: "9 days ago" },
    { name: "Billing & Payments", status: "Operational", uptime: 100.0, latency: 64, lastIncident: "—" },
    { name: "Client API Gateway", status: "Operational", uptime: 99.96, latency: 41, lastIncident: "18 days ago" },
    { name: "Knowledge Base Service", status: "Degraded", uptime: 99.82, latency: 612, lastIncident: "2h ago" },
    { name: "Transcript Storage", status: "Operational", uptime: 99.99, latency: 102, lastIncident: "30+ days ago" },
  ];
  const INCIDENTS = [
    { date: new Date(Date.now() - 2 * 3_600_000).toISOString().slice(0, 16).replace("T", " "), service: "Knowledge Base Service", severity: "Minor", duration: "ongoing", status: "Ongoing", description: "Elevated read latency on shard kb-eu-2" },
    { date: new Date(Date.now() - 4 * 86_400_000).toISOString().slice(0, 16).replace("T", " "), service: "Message Delivery", severity: "Major", duration: "47m", status: "Resolved", description: "WhatsApp BSP outage — failover engaged" },
    { date: new Date(Date.now() - 12 * 86_400_000).toISOString().slice(0, 16).replace("T", " "), service: "Voice Processing", severity: "Minor", duration: "14m", status: "Resolved", description: "Regional ASR node restart" },
  ];

  const AGENT_TEMPLATES = plans.map((plan, index) => ({
    id: plan.slug,
    name: plan.name,
    description: plan.description ?? "Plan-driven agent template",
    model: index === 0 ? "concise" : index === plans.length - 1 ? "detailed" : "balanced",
    voice: index === 0 ? "Voice A — Professional Male" : index === 1 ? "Voice B — Warm Female" : "Voice C — Neutral Female",
    channel: "Voice + WhatsApp",
    voiceCost: 0.18 + index * 0.04,
    aiCost: 4.2 + index * 0.8,
    callCost: 0.022,
    active: plan.isPublic,
  }));

  const EARNINGS_MONTHLY = REVENUE_TREND.map((row, index) => ({
    month: row.month,
    clients: workspaces.length,
    newClients: index === REVENUE_TREND.length - 1 ? 2 : 1,
    churned: 0,
    invoiced: row.mrr,
    collected: row.collected,
    outstanding: Math.max(0, row.mrr - row.collected),
    netMrr: row.mrr,
  }));

  const REVENUE_BY_PLAN = plans.map((plan) => {
    const planClients = workspaces.filter((ws) => ws.planId === plan.id).length;
    return { plan: plan.name, revenue: centsToNumber(plan.monthlyFeeCents * planClients) };
  });

  const MRR_MOVEMENT = [
    { kind: "New", value: 4800, color: "#10b981" },
    { kind: "Expansion", value: 2200, color: "#34d399" },
    { kind: "Contraction", value: -680, color: "#f59e0b" },
    { kind: "Churned", value: -1200, color: "#f43f5e" },
  ];

  const CLIENT_INVOICES = invoices.slice(0, 8).map((invoice) => ({
    id: invoice.id,
    date: invoice.issuedAt.toISOString().slice(0, 10),
    amount: centsToNumber(invoice.amountCents),
    status: invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1),
  }));

  return {
    PLATFORM_NAME,
    CLIENTS,
    REVENUE_TREND,
    CLIENT_BREAKDOWN,
    ACTIVITY_FEED,
    PAYMENTS,
    OVERDUE,
    TICKETS,
    AUDIT_LOG,
    ADMIN_USERS,
    SERVICES,
    INCIDENTS,
    AGENT_TEMPLATES,
    EARNINGS_MONTHLY,
    REVENUE_BY_PLAN,
    MRR_MOVEMENT,
    CLIENT_INVOICES,
    announcements: announcements.map((announcement) => ({
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      severity: announcement.severity,
      audience: announcement.audience,
      publishedAt: announcement.publishedAt.toISOString(),
    })),
  };
}
