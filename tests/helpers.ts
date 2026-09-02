// Shared helpers for unit and golden tests.

import type { UseProfileInput } from '../src/domain/schemas/profile.ts';
import type { SourcedValue } from '../src/domain/schemas/sourced-value.ts';
import { missingValue } from '../src/domain/schemas/sourced-value.ts';
import { toInstant, type Instant } from '../src/domain/schemas/time.ts';

/** Fixed reference instant: 2026-08-20T00:00:00.000Z. */
export const C0: Instant = toInstant(1787184000000);

export const THIRTY_DAYS_MS = 30 * 24 * 3_600_000;

/** User-supplied (non-null) value with user_estimate provenance. */
export function userValue<T>(value: T): SourcedValue<T> {
  return { value, provenance: 'user_estimate' };
}

/** Absent value (null value, missing provenance). */
export function absent<T>(): SourcedValue<T> {
  return missingValue<T>();
}

/** A valid tolerance_reset profile whose result is used only when overridden. */
export function sampleProfile(overrides: Partial<UseProfileInput> = {}): UseProfileInput {
  return {
    goal: 'tolerance_reset',
    breakRequested: true,
    postBreakMode: null,
    thcUseDaysLast30: userValue(20),
    sessionsPerUseDay: userValue(1),
    products: ['flower'],
    routes: ['smoking'],
    lastUseAt: userValue('2026-08-19T22:00:00Z'),
    previousBreaks: [],
    ...overrides,
  };
}
