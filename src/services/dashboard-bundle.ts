import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { gunzipSync } from "node:zlib";

import { env } from "../lib/env.js";

export interface MockAgent {
  id: string;
  name: string;
  type: "sales" | "support" | "booking" | "coldcall";
  avatarShape?: string;
  channels: Array<"voice" | "whatsapp">;
  status: "live" | "paused" | "idle";
  callsToday: number;
  conversion: number;
  avgDuration: string;
  personality?: string;
  language?: string;
  greeting?: string;
  rating?: number;
  kb?: string[];
}

export interface MockKnowledgeBase {
  id: string;
  title: string;
  type: string;
  updated: string;
  agents: number;
  tags: string[];
  content: string;
}

export interface MockTranscriptEntry {
  who?: string;
  speaker?: string;
  t?: string;
  timestampOffsetSec?: number;
  text: string;
}

export interface MockTranscript {
  id: string;
  agent: string;
  agentType: string;
  channel: "voice" | "whatsapp";
  caller: string;
  timestamp: string;
  duration: string;
  outcome: string;
  sentiment: "pos" | "neu" | "neg";
  metrics: {
    responseTime?: string;
    sentimentScore?: number;
    resolution?: string;
    followUp?: string;
  };
  chapters?: string[];
  thread: MockTranscriptEntry[];
}

export interface MockFeedEvent {
  id: number;
  kind: string;
  agent: string;
  text: string;
  when: string;
  pill: { label: string; cls: string };
  icon: string;
}

export interface DashboardSeedBundle {
  AGENTS: MockAgent[];
  FEED: MockFeedEvent[];
  VOLUME_30D: Array<{ day: number; label: string; voice: number; whatsapp: number }>;
  KB: MockKnowledgeBase[];
  TRANSCRIPTS: MockTranscript[];
  BILLING_MONTHS: Array<{ m: string; voice: number; ai: number; call: number }>;
  INVOICES: Array<{ id: string; date: string; amount: number; status: string }>;
  USAGE_ROWS: Array<{ agent: string; type: string; count: number; dur: string; unit: string; total: number }>;
  OBJECTION_BAR: Array<{ label: string; value: number }>;
  ISSUE_DONUT: Array<{ name: string; value: number; fill: string }>;
  CHANNEL_DONUT: Array<{ name: string; value: number; fill: string }>;
  CSAT_TREND: Array<{ week: string; csat: number }>;
  PEAK_HOURS: Array<{ hour: string; calls: number }>;
  HEATMAP: number[][];
  TEAM: Array<{ name: string; email: string; role: string; initials: string; color: string }>;
  WEBHOOKS: Array<{ id: string; url: string; events: string[]; status: string }>;
}

let cachedBundle: DashboardSeedBundle | null = null;

function decodeEntry(data: string, compressed: boolean): string {
  const buffer = Buffer.from(data, "base64");
  return compressed ? gunzipSync(buffer).toString("utf8") : buffer.toString("utf8");
}

export async function loadDashboardSeedBundle(): Promise<DashboardSeedBundle> {
  if (cachedBundle) {
    return cachedBundle;
  }

  const html = await readFile(env.dashboardHtmlPath, "utf8");
  const manifestMatch = html.match(/<script type="__bundler\/manifest">\s*([\s\S]*?)<\/script>/);

  if (!manifestMatch) {
    throw new Error(`Could not find bundled manifest in ${env.dashboardHtmlPath}`);
  }

  const manifest = JSON.parse(manifestMatch[1]) as Record<
    string,
    { data: string; compressed: boolean; mime: string }
  >;

  const dataSource = Object.values(manifest)
    .map((entry) => decodeEntry(entry.data, entry.compressed))
    .find((source) => source.includes("Mock data — agents, transcripts, KB, billing, analytics"));

  if (!dataSource) {
    throw new Error("Could not locate the dashboard mock-data asset inside the HTML bundle.");
  }

  const sandbox = {
    window: {} as Partial<DashboardSeedBundle>,
    Math,
    Date,
    Array,
    Object,
    console: {
      log() {
        return undefined;
      },
      warn() {
        return undefined;
      },
      error() {
        return undefined;
      },
    },
  };

  vm.createContext(sandbox);
  new vm.Script(dataSource).runInContext(sandbox);

  cachedBundle = sandbox.window as DashboardSeedBundle;
  return cachedBundle;
}

