// Active reduction (cut-down) domain rules — pure and deterministic.
//
// A reduction plan is a behavioural precommitment product, NOT a medical
// protocol. It stores the user's own limits (max THC-use days in a rolling
// 7-day window, max sessions per use day, optional THC strategy), records
// actual THC-use events, and derives plan state from those events:
//
//   - a logged event is a session; several events on the same local calendar
//     day increase that day's session count but never the use-day count;
//   - a new local day with >= 1 event increases the use-day count;
//   - the rolling window is the last 7 local calendar days ending today;
//   - exceeding the session cap on a day, or pushing the rolling use-day
//     count over the weekly cap, counts as one limit breach for that day;
//   - two distinct breach days within the rolling 7-day window trigger the
//     documented review rule: "consider a 3-7 day pause and review" — a
//     transparent product rule, never a biological reset claim.
//
// Day grouping uses the user's local calendar date. Events are stored as UTC
// instants; callers pass the current UTC offset in minutes (east of UTC
// positive) so the same instants never duplicate or silently disappear when a
// timezone changes.
//
// Logging a session never rewrites a tolerance recommendation. Tracked events
// drive the plan's own state only: they never regenerate, refresh or rewrite a
// frozen calculation record, and a stored record stays immutable.

import type { ProductKind, Route } from '../schemas/enums.ts';
import { toInstant, type Instant } from '../schemas/time.ts';

export const REDUCTION_ROLLING_WINDOW_DAYS = 7;
export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;

export type ReductionPlanStatus = 'active' | 'review_recommended' | 'paused' | 'ended';

export type ReductionOrigin = 'direct' | 'post_break';

export interface ThcStrategy {
  readonly avoidConcentrates: boolean;
  readonly lowerPotency: boolean;
  readonly lowerAmount: boolean;
}

export interface ReductionLimits {
  /** Max THC-use days in a rolling 7-day window (1..7). */
  readonly maxUseDaysPerWeek: number;
  /** Max sessions on a single use day (1..9). */
  readonly maxSessionsPerUseDay: number;
}

/** User-estimated baseline captured when the plan starts. Provenance note:
 * this is an estimate, not tracked exact history. */
export interface ReductionBaseline {
  readonly thcUseDaysLast30: number;
  readonly sessionsPerUseDay: number | null;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly currentPatternDuration: string | null;
}

/** One logged THC-use event = one session. Stored as a UTC instant. */
export interface UseEvent {
  readonly id: string;
  /** UTC instant the session happened (defaults to now, editable). */
  readonly usedAt: Instant;
  readonly product: ProductKind;
  readonly route: Route;
  /** UTC instant the event row was created (immutable ordering key). */
  readonly createdAt: Instant;
}

export interface ReductionPlan {
  readonly id: string;
  readonly origin: ReductionOrigin;
  readonly status: ReductionPlanStatus;
  readonly startedAt: Instant;
  readonly updatedAt: Instant;
  readonly limits: ReductionLimits;
  readonly strategy: ThcStrategy;
  readonly baseline: ReductionBaseline;
  readonly events: readonly UseEvent[];
}

export type BreachReason = 'sessions' | 'use_days';

export interface BreachDay {
  readonly dayKey: string;
  readonly reason: BreachReason;
}

export interface ReductionPlanState {
  /** Rolling-7 local-day use-day count ending today. */
  readonly rollingUseDays: number;
  /** Use days observed so far today (0 or 1). */
  readonly todayUsed: boolean;
  /** Sessions logged today. */
  readonly todaySessions: number;
  readonly sessionsLimit: number;
  /** Rolling use-day cap exceeded in the current window. */
  readonly useDaysExceeded: boolean;
  /** Sessions logged today exceed the session cap. */
  readonly sessionsExceededToday: boolean;
  /** Today's events breach the strategy (concentrate logged while the plan
   * says avoid concentrates). */
  readonly strategyExceededToday: boolean;
  /** Distinct breach days inside the rolling window. */
  readonly breaches: readonly BreachDay[];
  /** True when >= 2 distinct breach days sit inside the rolling window
   * (the documented 3-7 day pause/review product rule). */
  readonly reviewRecommended: boolean;
}

/**
 * Local calendar day key (yyyy-mm-dd) for a UTC instant under a fixed UTC
 * offset in minutes (positive east of UTC). Deterministic and timezone-safe.
 */
export function dayKeyForInstant(instant: Instant, utcOffsetMinutes: number): string {
  return new Date(instant + utcOffsetMinutes * 60 * 1000).toISOString().slice(0, 10);
}

/** Local day key for "today" at a fixed offset. */
export function todayKey(now: Instant, utcOffsetMinutes: number): string {
  return dayKeyForInstant(now, utcOffsetMinutes);
}

/** Returns the dayKey `daysAgo` local days before `dayKey` (inclusive). */
export function dayKeyMinus(dayKey: string, daysAgo: number, utcOffsetMinutes: number): string {
  const asUtcMidnight = Date.parse(`${dayKey}T00:00:00.000Z`);
  // The input is already a local calendar key, not an instant. Applying the
  // UTC offset again adds an extra day to windows west of UTC.
  return new Date(asUtcMidnight - daysAgo * MILLIS_PER_DAY).toISOString().slice(0, 10);
}

export function localDayKeysBetween(
  fromInclusive: string,
  toInclusive: string,
): readonly string[] {
  if (fromInclusive > toInclusive) return [];
  const keys: string[] = [];
  let current = fromInclusive;
  let guard = 0;
  while (current <= toInclusive && guard < 400) {
    keys.push(current);
    // Next calendar day by UTC arithmetic on the key.
    const next = new Date(Date.parse(`${current}T00:00:00.000Z`) + MILLIS_PER_DAY)
      .toISOString()
      .slice(0, 10);
    current = next;
    guard += 1;
  }
  return keys;
}

export function dayKeyOfEvent(event: UseEvent, utcOffsetMinutes: number): string {
  return dayKeyForInstant(event.usedAt, utcOffsetMinutes);
}

function eventsInWindow(
  events: readonly UseEvent[],
  now: Instant,
  utcOffsetMinutes: number,
  windowDays: number,
): readonly UseEvent[] {
  const startDay = dayKeyMinus(todayKey(now, utcOffsetMinutes), windowDays - 1, utcOffsetMinutes);
  return events.filter((event) => {
    const dayKey = dayKeyOfEvent(event, utcOffsetMinutes);
    return dayKey >= startDay && dayKey <= todayKey(now, utcOffsetMinutes);
  });
}

/** Distinct local days carrying at least one event inside the window. */
export function distinctUseDaysInWindow(
  events: readonly UseEvent[],
  now: Instant,
  utcOffsetMinutes: number,
  windowDays = REDUCTION_ROLLING_WINDOW_DAYS,
): number {
  const days = new Set(
    eventsInWindow(events, now, utcOffsetMinutes, windowDays).map((event) =>
      dayKeyOfEvent(event, utcOffsetMinutes),
    ),
  );
  return days.size;
}

export function sessionsOnDay(
  events: readonly UseEvent[],
  dayKey: string,
  utcOffsetMinutes: number,
): number {
  return events.filter((event) => dayKeyOfEvent(event, utcOffsetMinutes) === dayKey).length;
}

function distinctBreachDays(
  events: readonly UseEvent[],
  limits: ReductionLimits,
  now: Instant,
  utcOffsetMinutes: number,
): readonly BreachDay[] {
  const window = eventsInWindow(events, now, utcOffsetMinutes, REDUCTION_ROLLING_WINDOW_DAYS);
  const days = new Set(window.map((event) => dayKeyOfEvent(event, utcOffsetMinutes)));
  const breaches: BreachDay[] = [];
  for (const dayKey of [...days].sort()) {
    // Session breach: sessions on the day exceed the per-day cap.
    const sessions = events.filter((event) => dayKeyOfEvent(event, utcOffsetMinutes) === dayKey).length;
    // Use-day breach: pushing the rolling 7-day count (ending that local day)
    // over the weekly cap. Reference instant = end of that local day (clamped
    // to now when the day is today), so evening events count on their day.
    const localDayStartUtc = Date.parse(`${dayKey}T00:00:00.000Z`) - utcOffsetMinutes * 60 * 1000;
    const endOfLocalDayUtc = localDayStartUtc + MILLIS_PER_DAY - 1;
    const reference = toInstant(Math.min(now as number, endOfLocalDayUtc));
    const rolling = distinctUseDaysInWindow(events, reference, utcOffsetMinutes);
    if (sessions > limits.maxSessionsPerUseDay) breaches.push({ dayKey, reason: 'sessions' as const });
    if (rolling > limits.maxUseDaysPerWeek) breaches.push({ dayKey, reason: 'use_days' as const });
  }
  return breaches;
}

/**
 * Deterministic plan state from events. Pure: same events, limits, clock and
 * offset produce the same state.
 */
export function derivePlanState(
  events: readonly UseEvent[],
  limits: ReductionLimits,
  strategy: ThcStrategy,
  now: Instant,
  utcOffsetMinutes: number,
): ReductionPlanState {
  const today = todayKey(now, utcOffsetMinutes);
  const rollingUseDays = distinctUseDaysInWindow(events, now, utcOffsetMinutes);
  const todaySessions = sessionsOnDay(events, today, utcOffsetMinutes);
  const useDaysExceeded = rollingUseDays > limits.maxUseDaysPerWeek;
  const sessionsExceededToday = todaySessions > limits.maxSessionsPerUseDay;
  const strategyExceededToday =
    strategy.avoidConcentrates &&
    events.some(
      (event) => dayKeyOfEvent(event, utcOffsetMinutes) === today && event.product === 'concentrate',
    );
  const breaches = distinctBreachDays(events, limits, now, utcOffsetMinutes);
  return {
    rollingUseDays,
    todayUsed: todaySessions > 0,
    todaySessions,
    sessionsLimit: limits.maxSessionsPerUseDay,
    useDaysExceeded,
    sessionsExceededToday,
    strategyExceededToday,
    breaches,
    reviewRecommended: breaches.length >= 2,
  };
}

/** Stored status may need to reflect the derived review rule after events
 * change: two breach days in the rolling window put an active plan into
 * `review_recommended`; when the breaches age out the plan returns to active
 * automatically. `paused` and `ended` are user-controlled and never
 * auto-changed. */
export function statusAfterEvents(
  currentStatus: ReductionPlanStatus,
  state: ReductionPlanState,
): ReductionPlanStatus {
  if (currentStatus === 'paused' || currentStatus === 'ended') return currentStatus;
  return state.reviewRecommended ? 'review_recommended' : 'active';
}

/**
 * Reported weekly use-day rate: whole use days per week implied by the reported
 * 30-day count. Shared by the starting-limit suggestion and the tracker's
 * pattern line so the two can never disagree.
 */
export function weeklyUseDayRate(thcUseDaysLast30: number): number {
  return thcUseDaysLast30 <= 0 ? 0 : Math.ceil((thcUseDaysLast30 / 30) * 7);
}

/**
 * Product heuristic for starting limits based on the user's estimated
 * current pattern. Transparent, bounded, editable, never presented as a
 * medical recommendation. The day cap is one clear step below the reported
 * weekly use-day rate, clamped to 1..7; the session cap is one step below the
 * reported sessions per use day, floored at 1. A starting suggestion is always
 * editable — the tracker is a behavioural commitment, not a prescribed dose or
 * a claim that halving use is universally realistic.
 */
export function suggestedReductionLimits(
  baseline: Pick<ReductionBaseline, 'thcUseDaysLast30' | 'sessionsPerUseDay'>,
): ReductionLimits {
  const suggestedDays = Math.max(1, Math.min(7, weeklyUseDayRate(baseline.thcUseDaysLast30) - 1));
  const suggestedSessions = Math.max(1, (baseline.sessionsPerUseDay ?? 1) - 1);
  return {
    maxUseDaysPerWeek: suggestedDays,
    maxSessionsPerUseDay: suggestedSessions,
  };
}
