import type {
  Agent,
  BillingUsageSnapshot,
  Call,
  KnowledgeBaseDocument,
  MessageEvent,
  Transcript,
} from "@prisma/client";

import { env } from "../lib/env.js";
import { average, centsToNumber, formatSecondsAsClock, sum } from "../lib/utils.js";

export interface UsageTotals {
  voiceMinutes: number;
  aiMinutes: number;
  callMinutes: number;
  messageCount: number;
  transcriptMinutes: number;
  knowledgeDocumentCount: number;
  knowledgeUpdateCount: number;
  interactionsCount: number;
  durationSec: number;
}

export interface CostSummary {
  voiceAgentCostCents: number;
  aiAgentCostCents: number;
  callCostCents: number;
  totalSpendCents: number;
  invoiceTotalCents: number;
}

function roundCurrency(value: number): number {
  return Math.round(value);
}

export function calculateCosts(usage: UsageTotals): CostSummary {
  const voiceAgentCostCents = roundCurrency(usage.voiceMinutes * env.billing.voiceAgentRateCentsPerMinute);
  const aiAgentCostCents = roundCurrency(
    usage.aiMinutes * env.billing.aiAgentRateCentsPerMinute +
      usage.messageCount * env.billing.whatsappMessageRateCents +
      usage.transcriptMinutes * env.billing.transcriptRateCentsPerMinute +
      usage.knowledgeDocumentCount * env.billing.kbDocumentMonthlyRateCents +
      usage.knowledgeUpdateCount * env.billing.kbUpdateRateCents,
  );
  const callCostCents = roundCurrency(usage.callMinutes * env.billing.callRateCentsPerMinute);
  const totalSpendCents = voiceAgentCostCents + aiAgentCostCents + callCostCents;

  return {
    voiceAgentCostCents,
    aiAgentCostCents,
    callCostCents,
    totalSpendCents,
    invoiceTotalCents: totalSpendCents + env.billing.planFeeCents,
  };
}

export function buildUsageTotals(input: {
  calls: Call[];
  transcripts: Transcript[];
  messages: MessageEvent[];
  knowledgeBaseDocuments: KnowledgeBaseDocument[];
  periodStart: Date;
  periodEnd: Date;
}): UsageTotals {
  const inPeriodCalls = input.calls.filter(
    (call) => call.startedAt >= input.periodStart && call.startedAt <= input.periodEnd,
  );
  const inPeriodTranscripts = input.transcripts.filter(
    (transcript) => transcript.startedAt >= input.periodStart && transcript.startedAt <= input.periodEnd,
  );
  const inPeriodMessages = input.messages.filter(
    (message) => message.occurredAt >= input.periodStart && message.occurredAt <= input.periodEnd,
  );

  const voiceMinutes = sum(inPeriodCalls.map((call) => call.durationSec)) / 60;
  const transcriptMinutes = sum(inPeriodTranscripts.map((transcript) => transcript.durationSec)) / 60;

  return {
    voiceMinutes,
    aiMinutes: transcriptMinutes,
    callMinutes: voiceMinutes,
    messageCount: inPeriodMessages.length,
    transcriptMinutes,
    knowledgeDocumentCount: input.knowledgeBaseDocuments.length,
    knowledgeUpdateCount: input.knowledgeBaseDocuments.filter(
      (document) => document.updatedAt >= input.periodStart && document.updatedAt <= input.periodEnd,
    ).length,
    interactionsCount: inPeriodCalls.length + inPeriodMessages.length,
    durationSec: sum(inPeriodTranscripts.map((transcript) => transcript.durationSec)),
  };
}

export function buildUsageFromSnapshot(snapshot: BillingUsageSnapshot): UsageTotals {
  return {
    voiceMinutes: snapshot.voiceMinutes,
    aiMinutes: snapshot.aiMinutes,
    callMinutes: snapshot.callMinutes,
    messageCount: snapshot.messageCount,
    transcriptMinutes: snapshot.transcriptMinutes,
    knowledgeDocumentCount: snapshot.knowledgeDocumentCount,
    knowledgeUpdateCount: snapshot.knowledgeUpdateCount,
    interactionsCount: snapshot.messageCount,
    durationSec: snapshot.transcriptMinutes * 60,
  };
}

export function buildAgentUsageRow(input: {
  agent: Agent;
  calls: Call[];
  transcripts: Transcript[];
  messages: MessageEvent[];
  knowledgeBaseCount: number;
}): {
  agentId: string;
  agentName: string;
  type: string;
  count: number;
  durationSec: number;
  durationLabel: string;
  unitCostCents: number;
  unitCost: number;
  totalCostCents: number;
  totalCost: number;
} {
  const transcriptMinutes = sum(input.transcripts.map((transcript) => transcript.durationSec)) / 60;
  const usage: UsageTotals = {
    voiceMinutes: sum(input.calls.map((call) => call.durationSec)) / 60,
    aiMinutes: transcriptMinutes,
    callMinutes: sum(input.calls.map((call) => call.durationSec)) / 60,
    messageCount: input.messages.length,
    transcriptMinutes,
    knowledgeDocumentCount: input.knowledgeBaseCount,
    knowledgeUpdateCount: 0,
    interactionsCount: input.calls.length + input.messages.length,
    durationSec: sum(input.transcripts.map((transcript) => transcript.durationSec)),
  };

  const costs = calculateCosts(usage);
  const unitCostCents =
    usage.interactionsCount > 0 ? Math.round(costs.totalSpendCents / usage.interactionsCount) : 0;

  return {
    agentId: input.agent.id,
    agentName: input.agent.name,
    type: input.agent.type,
    count: usage.interactionsCount,
    durationSec: usage.durationSec,
    durationLabel: formatSecondsAsClock(usage.durationSec),
    unitCostCents,
    unitCost: centsToNumber(unitCostCents),
    totalCostCents: costs.totalSpendCents,
    totalCost: centsToNumber(costs.totalSpendCents),
  };
}

export function buildSpendSummary(usage: UsageTotals) {
  const costs = calculateCosts(usage);
  const avgDurationSec = usage.interactionsCount > 0 ? usage.durationSec / usage.interactionsCount : 0;

  return {
    ...costs,
    avgDurationSec,
    avgDurationLabel: formatSecondsAsClock(avgDurationSec),
    budgetCents: env.billing.monthlyBudgetCents,
    budgetRemainingCents: env.billing.monthlyBudgetCents - costs.totalSpendCents,
    budgetUsedPercent:
      env.billing.monthlyBudgetCents > 0
        ? Number(((costs.totalSpendCents / env.billing.monthlyBudgetCents) * 100).toFixed(1))
        : 0,
  };
}

export function buildAggregateTrend(snapshots: BillingUsageSnapshot[]) {
  return snapshots.map((snapshot) => {
    const usage = buildUsageFromSnapshot(snapshot);
    const costs = calculateCosts(usage);

    return {
      label: snapshot.label,
      periodStart: snapshot.periodStart.toISOString(),
      periodEnd: snapshot.periodEnd.toISOString(),
      voice: centsToNumber(costs.voiceAgentCostCents),
      ai: centsToNumber(costs.aiAgentCostCents),
      call: centsToNumber(costs.callCostCents),
      total: centsToNumber(costs.totalSpendCents),
    };
  });
}

export function buildAnalyticsRevenue(transcripts: Transcript[]): number {
  const convertedCount = transcripts.filter((transcript) => transcript.outcome?.toLowerCase() === "converted").length;
  return centsToNumber(convertedCount * env.analytics.revenuePerConversionCents);
}

export function buildAverageSentiment(transcripts: Transcript[]): number {
  const scores = transcripts
    .map((transcript) => transcript.sentimentScore)
    .filter((score): score is number => typeof score === "number");

  return Number(average(scores).toFixed(2));
}

