import { randomUUID } from "node:crypto";

export const DEFAULT_WORKSPACE_ID = "ws_default";

export const SUCCESS_OUTCOMES = new Set([
  "converted",
  "completed",
  "booked",
  "interest",
  "resolved",
]);

export function createPrefixedId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 10)}`;
}

export function centsToNumber(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export function percentage(value: number): number {
  return Number(value.toFixed(1));
}

export function average(numbers: number[]): number {
  if (numbers.length === 0) {
    return 0;
  }

  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function sum(numbers: number[]): number {
  return numbers.reduce((total, value) => total + value, 0);
}

export function parseClockDurationToSeconds(input: string): number {
  const [minutes, seconds] = input.split(":").map((part) => Number(part));

  if (!Number.isFinite(minutes) || !Number.isFinite(seconds)) {
    return 0;
  }

  return minutes * 60 + seconds;
}

export function parseHourMinuteDurationToSeconds(input: string): number {
  const match = input.match(/(?:(\d+)h)?\s*(?:(\d+)m)?/i);
  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  return hours * 3600 + minutes * 60;
}

export function formatSecondsAsClock(seconds: number): string {
  const clamped = Math.max(0, Math.round(seconds));
  const hours = Math.floor(clamped / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const remainingSeconds = clamped % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export function formatRelativeDate(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return "today";
  }

  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) {
    return `${diffWeeks}w ago`;
  }

  return date.toISOString().slice(0, 10);
}

export function startOfCurrentMonth(reference = new Date()): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function endOfCurrentMonth(reference = new Date()): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function startOfDay(reference = new Date()): Date {
  return new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate(), 0, 0, 0, 0));
}

export function toMonthLabel(date: Date): string {
  return date.toLocaleString("en-US", { month: "short" });
}

export function safeJsonParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function toDateOrNull(value: string | Date | undefined | null): Date | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export function normalizeOutcome(value: string | null | undefined): string | null {
  return value ? value.trim().toLowerCase() : null;
}

export function isSuccessfulOutcome(value: string | null | undefined): boolean {
  const normalized = normalizeOutcome(value);
  return normalized ? SUCCESS_OUTCOMES.has(normalized) : false;
}

