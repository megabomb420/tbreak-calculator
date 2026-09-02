// Shared decode predicates for persisted record stores. Record stores keep
// instants as integer epoch milliseconds (matching the questionnaire-progress
// and snapshot records) and timestamps as ISO-8601 strings with a timezone
// (matching submitted `lastUseAt` values).

import { parseSubmittedTimestamp } from '../../domain/schemas/time.ts';

export function isInstantNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value);
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
