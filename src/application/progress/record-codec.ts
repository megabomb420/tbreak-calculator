// Shared decode predicates for persisted record stores. Record stores keep
// instants as integer epoch milliseconds (matching the questionnaire-progress
// and snapshot records) and timestamps as ISO-8601 strings with a timezone
// (matching submitted `lastUseAt` values).

import { parseSubmittedTimestamp } from '../../domain/schemas/time.ts';

/** JS `Date` is defined on ±1e8 days from epoch. Instants outside that range
 * cannot be displayed or compared safely and must fail closed. */
const MAX_DATE_MS = 8.64e15;

export function isInstantNumber(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= -MAX_DATE_MS &&
    value <= MAX_DATE_MS
  );
}

export function isOptionalInstantNumber(value: unknown): value is number | null {
  return value === null || isInstantNumber(value);
}

export function isIsoTimestamp(value: unknown): value is string {
  return typeof value === 'string' && parseSubmittedTimestamp(value) !== null;
}

export function isOptionalIsoTimestamp(value: unknown): value is string | null {
  return value === null || isIsoTimestamp(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Core profile SourcedValue: `missing`+null or `user_estimate`+payload. */
export function isCoreSourcedValue(value: unknown, isPayload: (payload: unknown) => boolean): boolean {
  if (!isRecord(value)) return false;
  if (value.provenance === 'missing') return value.value === null;
  if (value.provenance === 'user_estimate') return value.value !== null && isPayload(value.value);
  return false;
}

/** First occurrence of each id wins (newest-first envelopes). Later duplicates
 * are treated as corrupt siblings and dropped in isolation. */
export function firstById<T extends { readonly id: string }>(rows: readonly T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    unique.push(row);
  }
  return unique;
}
