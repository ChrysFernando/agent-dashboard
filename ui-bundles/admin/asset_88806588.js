/* ============================================================
   MOCK DATA — Sentinel Super Admin Console
   ============================================================ */

const PLATFORM_NAME = "Sentinel";

const CLIENTS = [
  { id: "C-9F4A1B", company: "Helio Logistics", contact: "Marta Quiroz",   email: "marta@heliologistics.com",   country: "Mexico",        plan: "Enterprise", status: "Active",   mrr: 8400,  totalPaid: 184200, agents: 12, joined: "2024-03-12", lastActive: "2m ago",   phone: "+52 55 4421 9088", timezone: "America/Mexico_City" },
  { id: "C-7B22C9", company: "Northwind Cargo", contact: "Erik Halvorsen", email: "erik@northwind.no",         country: "Norway",        plan: "Pro",        status: "Active",   mrr: 3200,  totalPaid: 74600,  agents: 6,  joined: "2024-06-04", lastActive: "14m ago",  phone: "+47 22 88 14 02",  timezone: "Europe/Oslo" },
  { id: "C-44E812", company: "Atlas Realty",    contact: "Priya Kapoor",   email: "p.kapoor@atlasrealty.in",   country: "India",         plan: "Growth",     status: "Overdue",  mrr: 1200,  totalPaid: 28800,  agents: 4,  joined: "2024-08-22", lastActive: "3h ago",   phone: "+91 22 6655 1100", timezone: "Asia/Kolkata" },
  { id: "C-2D55A0", company: "Vector Health",   contact: "Daniel Okonkwo", email: "d.okonkwo@vectorhealth.io", country: "Nigeria",       plan: "Pro",        status: "Active",   mrr: 4800,  totalPaid: 96000,  agents: 8,  joined: "2024-04-18", lastActive: "1h ago",   phone: "+234 1 277 8830",  timezone: "Africa/Lagos" },
  { id: "C-8910FE", company: "Lumen Studio",    contact: "Sara Brennan",   email: "sara@lumenstudio.co",       country: "United States", plan: "Starter",    status: "Trial",    mrr: 0,     totalPaid: 0,      agents: 1,  joined: "2026-05-08", lastActive: "9m ago",   phone: "+1 415 555 0142",  timezone: "America/Los_Angeles" },
  { id: "C-1C76B4", company: "Bright Hostels",  contact: "Tomás Ferreira", email: "tomas@brighthostels.pt",    country: "Portugal",      plan: "Growth",     status: "Active",   mrr: 990,   totalPaid: 21780,  agents: 3,  joined: "2024-09-30", lastActive: "5h ago",   phone: "+351 21 444 2200", timezone: "Europe/Lisbon" },
  { id: "C-5520F8", company: "Orbis Energy",    contact: "Hannah Wei",     email: "h.wei@orbisenergy.com",     country: "Singapore",     plan: "Enterprise", status: "Active",   mrr: 12400, totalPaid: 248000, agents: 18, joined: "2023-11-02", lastActive: "20m ago",  phone: "+65 6700 1455",    timezone: "Asia/Singapore" },
  { id: "C-66AA31", company: "Pinetree Dental", contact: "Greg Mahoney",   email: "greg@pinetreedental.ca",    country: "Canada",        plan: "Starter",    status: "Active",   mrr: 290,   totalPaid: 4640,   agents: 2,  joined: "2024-12-14", lastActive: "2 days",   phone: "+1 604 555 9920",  timezone: "America/Vancouver" },
  { id: "C-7E8800", company: "Kairos Legal",    contact: "Ines Moreau",    email: "ines@kairos-legal.fr",      country: "France",        plan: "Pro",        status: "Blocked",  mrr: 0,     totalPaid: 56800,  agents: 0,  joined: "2024-01-25", lastActive: "31 days",  phone: "+33 1 4488 6620",  timezone: "Europe/Paris" },
  { id: "C-A11C29", company: "Maple Movers",    contact: "Liam Chen",      email: "liam@maplemovers.com",      country: "United States", plan: "Growth",     status: "Overdue",  mrr: 1490,  totalPaid: 17880,  agents: 4,  joined: "2025-02-11", lastActive: "8h ago",   phone: "+1 312 555 6014",  timezone: "America/Chicago" },
  { id: "C-D3E441", company: "SolWave Travel",  contact: "Yara Haddad",    email: "yara@solwave.co",           country: "UAE",           plan: "Pro",        status: "Trial",    mrr: 0,     totalPaid: 0,      agents: 2,  joined: "2026-05-15", lastActive: "1h ago",   phone: "+971 4 277 6602",  timezone: "Asia/Dubai" },
  { id: "C-F02D11", company: "Quanta Robotics", contact: "Mio Tanaka",     email: "mio@quanta-robotics.jp",    country: "Japan",         plan: "Enterprise", status: "Active",   mrr: 9600,  totalPaid: 192000, agents: 14, joined: "2024-02-08", lastActive: "44m ago",  phone: "+81 3 4400 9911",  timezone: "Asia/Tokyo" },
];

const REVENUE_TREND = [
  { month: "Jun '25", mrr: 28100, collected: 26800 },
  { month: "Jul '25", mrr: 30200, collected: 29900 },
  { month: "Aug '25", mrr: 32500, collected: 31200 },
  { month: "Sep '25", mrr: 34800, collected: 33700 },
  { month: "Oct '25", mrr: 36100, collected: 35100 },
  { month: "Nov '25", mrr: 37900, collected: 36800 },
  { month: "Dec '25", mrr: 39400, collected: 37900 },
  { month: "Jan '26", mrr: 41200, collected: 40100 },
  { month: "Feb '26", mrr: 42600, collected: 41200 },
  { month: "Mar '26", mrr: 44000, collected: 42100 },
  { month: "Apr '26", mrr: 45100, collected: 43800 },
  { month: "May '26", mrr: 46570, collected: 44120 },
];

const CLIENT_BREAKDOWN = [
  { name: "Active",   count: 7, color: "#10b981" },
  { name: "Trial",    count: 2, color: "#f59e0b" },
  { name: "Overdue",  count: 2, color: "#f43f5e" },
  { name: "Blocked",  count: 1, color: "#6b7280" },
  { name: "Churned",  count: 3, color: "#4b5563" },
];

const ACTIVITY_FEED = [
  { ts: "11:42:18", action: "payment_received",  client: "Orbis Energy",     amount: 12400, kind: "good" },
  { ts: "11:39:02", action: "signup",            client: "SolWave Travel",   kind: "good" },
  { ts: "11:31:55", action: "payment_failed",    client: "Atlas Realty",     amount: 1200,  kind: "bad" },
  { ts: "11:28:40", action: "agent_created",     client: "Quanta Robotics",  detail: "outbound_sales_v2", kind: "neutral" },
  { ts: "11:22:14", action: "ticket_opened",     client: "Helio Logistics",  detail: "T-2046", kind: "neutral" },
  { ts: "11:18:09", action: "plan_upgrade",      client: "Vector Health",    detail: "Growth → Pro", kind: "good" },
  { ts: "11:11:31", action: "account_blocked",   client: "Kairos Legal",     kind: "bad" },
  { ts: "11:04:22", action: "payment_received",  client: "Quanta Robotics",  amount: 9600,  kind: "good" },
  { ts: "10:58:01", action: "signup",            client: "Lumen Studio",     kind: "good" },
  { ts: "10:52:44", action: "ticket_opened",     client: "Maple Movers",     detail: "T-2045", kind: "neutral" },
  { ts: "10:47:18", action: "payment_received",  client: "Northwind Cargo",  amount: 3200,  kind: "good" },
  { ts: "10:40:09", action: "payment_failed",    client: "Maple Movers",     amount: 1490,  kind: "bad" },
];

const PAYMENTS = [
  { id: "P-2026-04812", client: "Orbis Energy",     date: "2026-05-22", amount: 12400, plan: "Enterprise", method: "ACH ****4421",   status: "Paid" },
  { id: "P-2026-04811", client: "Quanta Robotics",  date: "2026-05-22", amount: 9600,  plan: "Enterprise", method: "Wire ****9921",  status: "Paid" },
  { id: "P-2026-04810", client: "Helio Logistics",  date: "2026-05-21", amount: 8400,  plan: "Enterprise", method: "Card ****1129",  status: "Paid" },
  { id: "P-2026-04809", client: "Vector Health",    date: "2026-05-21", amount: 4800,  plan: "Pro",        method: "Card ****8810",  status: "Paid" },
  { id: "P-2026-04808", client: "Northwind Cargo",  date: "2026-05-20", amount: 3200,  plan: "Pro",        method: "Card ****6655",  status: "Paid" },
  { id: "P-2026-04807", client: "Atlas Realty",     date: "2026-05-19", amount: 1200,  plan: "Growth",     method: "Card ****0042",  status: "Overdue" },
  { id: "P-2026-04806", client: "Maple Movers",     date: "2026-05-18", amount: 1490,  plan: "Growth",     method: "Card ****5511",  status: "Failed" },
  { id: "P-2026-04805", client: "Bright Hostels",   date: "2026-05-17", amount: 990,   plan: "Growth",     method: "SEPA ****3308",  status: "Paid" },
  { id: "P-2026-04804", client: "Pinetree Dental",  date: "2026-05-16", amount: 290,   plan: "Starter",    method: "Card ****9920",  status: "Paid" },
  { id: "P-2026-04803", client: "Atlas Realty",     date: "2026-04-19", amount: 1200,  plan: "Growth",     method: "Card ****0042",  status: "Failed" },
  { id: "P-2026-04802", client: "Maple Movers",     date: "2026-04-18", amount: 1490,  plan: "Growth",     method: "Card ****5511",  status: "Pending" },
  { id: "P-2026-04801", client: "Lumen Studio",     date: "2026-05-08", amount: 0,     plan: "Starter",    method: "—",              status: "Pending" },
  { id: "P-2026-04800", client: "Orbis Energy",     date: "2026-04-22", amount: 12400, plan: "Enterprise", method: "ACH ****4421",   status: "Paid" },
  { id: "P-2026-04799", client: "Helio Logistics",  date: "2026-04-21", amount: 8400,  plan: "Enterprise", method: "Card ****1129",  status: "Refunded" },
];

const OVERDUE = [
  { client: "Atlas Realty",  amount: 2400, days: 33, lastContact: "2026-05-08" },
  { client: "Maple Movers",  amount: 1490, days: 12, lastContact: "2026-05-14" },
];

const TICKETS = [
  { id: "T-2046", client: "Helio Logistics", subject: "Voice agent dropping calls on transfer", category: "Technical",  priority: "High",   status: "Open",              opened: "2026-05-23 11:22", assigned: "Maya R.",   lastUpdate: "12m ago" },
  { id: "T-2045", client: "Maple Movers",    subject: "Invoice #INV-4188 marked overdue in error", category: "Billing", priority: "Medium", status: "In Progress",       opened: "2026-05-23 10:52", assigned: "Daniel K.", lastUpdate: "1h ago"  },
  { id: "T-2044", client: "Vector Health",   subject: "Request to enable WhatsApp channel",       category: "Feature Request", priority: "Low", status: "Waiting on Client", opened: "2026-05-22 16:08", assigned: "Maya R.",   lastUpdate: "3h ago"  },
  { id: "T-2043", client: "Northwind Cargo", subject: "Knowledge base sync failing nightly",      category: "Technical",  priority: "High",   status: "In Progress",   opened: "2026-05-22 09:14", assigned: "Daniel K.", lastUpdate: "5h ago"  },
  { id: "T-2042", client: "Orbis Energy",    subject: "Add second admin seat",                    category: "Account",    priority: "Low",    status: "Resolved",      opened: "2026-05-21 14:30", assigned: "Maya R.",   lastUpdate: "1 day"   },
  { id: "T-2041", client: "Atlas Realty",    subject: "Payment retry not triggering",             category: "Billing",    priority: "High",   status: "Open",          opened: "2026-05-21 11:02", assigned: "—",         lastUpdate: "2 days"  },
  { id: "T-2040", client: "Bright Hostels",  subject: "Agent voice profile request",              category: "Other",      priority: "Low",    status: "Closed",        opened: "2026-05-20 08:44", assigned: "Maya R.",   lastUpdate: "3 days"  },
  { id: "T-2039", client: "Quanta Robotics", subject: "API rate limit increase",                  category: "Technical",  priority: "Medium", status: "Resolved",      opened: "2026-05-19 13:01", assigned: "Daniel K.", lastUpdate: "4 days"  },
];

const AUDIT_LOG = [
  { ts: "2026-05-23 11:42:18", admin: "Maya R.",   action: "Plan changed",     type: "modified", target: "Vector Health → Pro",          ip: "10.42.18.4",   details: "MRR 3200 → 4800" },
  { ts: "2026-05-23 11:39:02", admin: "System",    action: "Client created",   type: "created",  target: "SolWave Travel (C-D3E441)",    ip: "system",        details: "Self-signup via /onboard" },
  { ts: "2026-05-23 11:31:55", admin: "Daniel K.", action: "Reminder sent",    type: "financial",target: "Atlas Realty",                 ip: "10.42.18.9",   details: "Overdue notice — INV-4188" },
  { ts: "2026-05-23 11:18:33", admin: "Maya R.",   action: "Note added",       type: "modified", target: "Helio Logistics",              ip: "10.42.18.4",   details: "Internal: contact prefers async" },
  { ts: "2026-05-23 11:11:31", admin: "Daniel K.", action: "Account blocked",  type: "blocked",  target: "Kairos Legal",                 ip: "10.42.18.9",   details: "Reason: chargeback dispute" },
  { ts: "2026-05-23 11:04:22", admin: "System",    action: "Invoice sent",     type: "created",  target: "Quanta Robotics",              ip: "system",        details: "INV-4192 — $9,600" },
  { ts: "2026-05-23 10:58:01", admin: "System",    action: "Client created",   type: "created",  target: "Lumen Studio (C-8910FE)",      ip: "system",        details: "Trial — 14 days" },
  { ts: "2026-05-23 10:52:44", admin: "Maya R.",   action: "Ticket opened",    type: "created",  target: "T-2045 / Maple Movers",        ip: "10.42.18.4",   details: "On behalf of client" },
  { ts: "2026-05-23 10:47:18", admin: "System",    action: "Payment captured", type: "financial",target: "Northwind Cargo",              ip: "system",        details: "$3,200 — Card ****6655" },
  { ts: "2026-05-23 10:40:09", admin: "System",    action: "Payment failed",   type: "financial",target: "Maple Movers",                 ip: "system",        details: "Card declined — insufficient funds" },
  { ts: "2026-05-23 10:33:50", admin: "Maya R.",   action: "Impersonation",    type: "auth",     target: "Vector Health",                ip: "10.42.18.4",   details: "Session started" },
  { ts: "2026-05-23 10:32:11", admin: "Maya R.",   action: "Login",            type: "auth",     target: "—",                            ip: "10.42.18.4",   details: "2FA verified" },
  { ts: "2026-05-23 10:18:02", admin: "Daniel K.", action: "Credit added",     type: "financial",target: "Northwind Cargo",              ip: "10.42.18.9",   details: "+$200 — service degradation" },
  { ts: "2026-05-23 10:02:44", admin: "Daniel K.", action: "Config updated",   type: "modified", target: "Agent template: Booking",      ip: "10.42.18.9",   details: "Voice profile B → D" },
  { ts: "2026-05-23 09:48:11", admin: "Daniel K.", action: "Login",            type: "auth",     target: "—",                            ip: "10.42.18.9",   details: "2FA verified" },
];

const ADMIN_USERS = [
  { name: "Maya Reyes",     email: "maya@sentinel.ops",   role: "Super Admin", lastLogin: "Today 10:32",   status: "Active" },
  { name: "Daniel Khoury",  email: "daniel@sentinel.ops", role: "Operations",  lastLogin: "Today 09:48",   status: "Active" },
  { name: "Priya Nair",     email: "priya@sentinel.ops",  role: "Finance",     lastLogin: "Yesterday",     status: "Active" },
  { name: "Jordan Ellis",   email: "jordan@sentinel.ops", role: "Support",     lastLogin: "3 days ago",    status: "Active" },
  { name: "Inactive Admin", email: "old@sentinel.ops",    role: "Support",     lastLogin: "62 days ago",   status: "Revoked" },
];

const SERVICES = [
  { name: "Voice Processing Engine",   status: "Operational", uptime: 99.98, latency: 142, lastIncident: "12 days ago" },
  { name: "AI Language Processing",    status: "Operational", uptime: 99.99, latency: 218, lastIncident: "28 days ago" },
  { name: "Message Delivery (WhatsApp)",status:"Operational", uptime: 99.94, latency: 380, lastIncident: "4 days ago" },
  { name: "Call Routing Service",      status: "Operational", uptime: 99.97, latency: 88,  lastIncident: "9 days ago" },
  { name: "Billing & Payments",        status: "Operational", uptime: 100.0, latency: 64,  lastIncident: "— " },
  { name: "Client API Gateway",        status: "Operational", uptime: 99.96, latency: 41,  lastIncident: "18 days ago" },
  { name: "Knowledge Base Service",    status: "Degraded",    uptime: 99.82, latency: 612, lastIncident: "2h ago" },
  { name: "Transcript Storage",        status: "Operational", uptime: 99.99, latency: 102, lastIncident: "30+ days ago" },
];

const INCIDENTS = [
  { date: "2026-05-23 09:08", service: "Knowledge Base Service", severity: "Minor",    duration: "ongoing", status: "Ongoing",   description: "Elevated read latency on shard kb-eu-2" },
  { date: "2026-05-19 14:42", service: "Message Delivery",       severity: "Major",    duration: "47m",     status: "Resolved",  description: "WhatsApp BSP outage — failover engaged" },
  { date: "2026-05-11 02:18", service: "Voice Processing",       severity: "Minor",    duration: "14m",     status: "Resolved",  description: "Regional ASR node restart" },
  { date: "2026-04-30 22:04", service: "Client API Gateway",     severity: "Major",    duration: "1h 12m",  status: "Resolved",  description: "Rate limiter misconfiguration after deploy" },
  { date: "2026-04-22 06:30", service: "AI Language Processing", severity: "Critical", duration: "2h 04m",  status: "Resolved",  description: "Upstream model provider 5xx spike" },
];

const AGENT_TEMPLATES = [
  { id: "call_center", name: "Call Center",  description: "Inbound support agent with escalation paths", model: "balanced", voice: "Voice A — Professional Male", channel: "Voice",      voiceCost: 0.18, aiCost: 4.20, callCost: 0.022, active: true },
  { id: "sales",       name: "Sales",        description: "Outbound qualifier with discovery prompts",   model: "detailed", voice: "Voice B — Warm Female",       channel: "Voice + WhatsApp", voiceCost: 0.24, aiCost: 5.80, callCost: 0.022, active: true },
  { id: "booking",     name: "Booking",      description: "Appointment scheduler with calendar sync",    model: "concise",  voice: "Voice C — Neutral Female",    channel: "Voice + WhatsApp", voiceCost: 0.16, aiCost: 3.40, callCost: 0.022, active: true },
  { id: "cold_call",   name: "Cold Call",    description: "High-volume outreach with consent gating",    model: "balanced", voice: "Voice D — Confident Male",    channel: "Voice",      voiceCost: 0.20, aiCost: 4.80, callCost: 0.018, active: false },
];

const EARNINGS_MONTHLY = [
  { month: "Dec '25", clients: 38, newClients: 4, churned: 1, invoiced: 39400, collected: 37900, outstanding: 1500, netMrr: 39400 },
  { month: "Jan '26", clients: 41, newClients: 5, churned: 2, invoiced: 41200, collected: 40100, outstanding: 1100, netMrr: 41200 },
  { month: "Feb '26", clients: 43, newClients: 3, churned: 1, invoiced: 42600, collected: 41200, outstanding: 1400, netMrr: 42600 },
  { month: "Mar '26", clients: 46, newClients: 4, churned: 1, invoiced: 44000, collected: 42100, outstanding: 1900, netMrr: 44000 },
  { month: "Apr '26", clients: 48, newClients: 3, churned: 1, invoiced: 45100, collected: 43800, outstanding: 1300, netMrr: 45100 },
  { month: "May '26", clients: 50, newClients: 4, churned: 2, invoiced: 46570, collected: 44120, outstanding: 2450, netMrr: 46570 },
];

const REVENUE_BY_PLAN = [
  { plan: "Enterprise", revenue: 30400 },
  { plan: "Pro",        revenue: 11200 },
  { plan: "Growth",     revenue: 3680  },
  { plan: "Starter",    revenue: 1290  },
];

const MRR_MOVEMENT = [
  { kind: "New",         value: 4800,  color: "#10b981" },
  { kind: "Expansion",   value: 2200,  color: "#34d399" },
  { kind: "Contraction", value: -680,  color: "#f59e0b" },
  { kind: "Churned",     value: -1200, color: "#f43f5e" },
];

const CLIENT_INVOICES = [
  { id: "INV-4192", date: "2026-05-21", amount: 8400, status: "Paid" },
  { id: "INV-4156", date: "2026-04-21", amount: 8400, status: "Paid" },
  { id: "INV-4118", date: "2026-03-21", amount: 8400, status: "Paid" },
  { id: "INV-4082", date: "2026-02-21", amount: 8400, status: "Paid" },
  { id: "INV-4044", date: "2026-01-21", amount: 8400, status: "Paid" },
];

/* ============================================================
   HELPERS
   ============================================================ */

const fmtMoney = (n) => "$" + Math.round(Math.abs(n)).toLocaleString();
const fmtMoneySigned = (n) => (n < 0 ? "-" : "") + "$" + Math.round(Math.abs(n)).toLocaleString();
const fmtAbbrev = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (abs >= 1_000)     return (n / 1_000).toFixed(1) + "K";
  return Math.round(n).toLocaleString();
};
const fmtPct = (n, decimals = 1) => n.toFixed(decimals) + "%";
const formatDate = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const daysAgo = (n) => `${n}d ago`;

// expose on window
Object.assign(window, {
  PLATFORM_NAME, CLIENTS, REVENUE_TREND, CLIENT_BREAKDOWN, ACTIVITY_FEED,
  PAYMENTS, OVERDUE, TICKETS, AUDIT_LOG, ADMIN_USERS, SERVICES, INCIDENTS,
  AGENT_TEMPLATES, EARNINGS_MONTHLY, REVENUE_BY_PLAN, MRR_MOVEMENT, CLIENT_INVOICES,
  fmtMoney, fmtMoneySigned, fmtAbbrev, fmtPct, formatDate, daysAgo,
});
