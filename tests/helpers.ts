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

/** Forbidden personal-claim patterns for advice, community, research-fact and
 * recovery copy: a personal reset/clearance percentage, a per-day symptom
 * prediction, a guaranteed timeline, a personal detection window. Population
 * findings stay legitimate — the recovery copy quotes a study's "about 15%
 * lower" availability — so the percentage rule needs a personal subject rather
 * than a blanket `\d+%`. */
export const FORBIDDEN_PERSONAL_CLAIMS: readonly RegExp[] = [
  /\b(?:you(?:'ll| will| are)?|your|yours)\b[^.]{0,60}?\d{1,3}(?:\.\d+)?\s*%/i,
  /\d{1,3}(?:\.\d+)?\s*%[^.]{0,60}?\b(?:you|your|yours)\b/i,
  /\byou(?:'ll| will)\b[^.]{0,60}?\bday\s*\d+\b/i,
  /\byour\b[^.]{0,40}?\bwill\b[^.]{0,60}?\bday\s*\d+\b/i,
  /\bday\s*\d+\b[^.]{0,60}?\byou(?:'ll| will)\b/i,
  /\bday\s*\d+\b[^.]{0,60}?\byour\b[^.]{0,40}?\bwill\b/i,
  /\bguarantee(?:d|s)?\b[^.]{0,60}?\b(?:by|in|within|after|at)\s+(?:day\s*\d+|\d+\s*(?:hour|day|week|month)s?|(?:hour|day|week|month)s?\s*\d+)\b/i,
  /\b(?:by|in|within|after)\s+(?:day\s*\d+|\d+\s*(?:hour|day|week|month)s?|(?:hour|day|week|month)s?\s*\d+)\b[^.]{0,60}?\bguarantee(?:d|s)?\b/i,
  /\b(?:your|you(?:'ll| will))\b[^.]{0,60}?\b(?:detection window|detectable|test (?:negative|positive|clean)|be clean|clear your system)\b/i,
  /\b(?:detection window|detectable|test (?:negative|positive|clean))\b[^.]{0,60}?\b(?:you|your)\b/i,
  /\b(?:you|your)\b[^.]{0,60}?\b(?:detection window|detectable)\b[^.]{0,40}?(?:day\s*\d+|\d+\s*(?:hour|day|week|month)s?|(?:hour|day|week|month)s?\s*\d+)\b/i,
];

/** One example per forbidden claim family, so the guards prove they bite. */
export const FORBIDDEN_CLAIM_SAMPLES: readonly string[] = [
  'You will have recovered 80% of your tolerance by the end of the break.',
  'Your reset is 90% complete after four weeks.',
  'By day 5 you will feel back to normal.',
  'You will notice your sleep settle by day 10.',
  'Your cravings will stop after day 7.',
  'Your recovery is guaranteed by day 28.',
  'By week 4 your reset is guaranteed.',
  'You will test negative 30 days after your last use.',
  'Your detection window is about 30 days for urine.',
];

/** Quoted research findings and recorded facts the patterns must never flag. */
export const ALLOWED_EVIDENCE_QUOTES: readonly string[] = [
  'CB1 availability was about 15% lower than controls at baseline.',
  'Around four weeks is a useful research anchor — not a universal point where tolerance is guaranteed to be fully reset.',
  'This older saved outlook used Day 28 as a biological reference, not a guaranteed full-reset day.',
  'Your recorded sleep rating went from 5/10 (Day 2) to 7/10 (Day 5).',
  'Your previous 21-day break was rated 7/10 for tolerance reduction.',
  'It does not mean your shorter estimated window should be extended to Day 28.',
  'Individual experiences from a similar point in a break — not a prediction of what will happen to you.',
  'This does not estimate a personal detection window.',
];
