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
// The rule that recomputes the tolerance recommendation NEVER adds days per
// logged event. It re-runs the full tolerance engine on an observed profile
// derived from tracked events (see `observedPattern`), or asks for the minimum
// missing refresh data when 30 days of exact history do not exist yet.

import type { ProductKind, Route } from '../schemas/enums.ts';
import type { RecommendedRangeDays } from '../schemas/result.ts';
import { toInstant, type Instant } from '../schemas/time.ts';

export const REDUCTION_ROLLING_WINDOW_DAYS = 7;
export const REDUCTION_OBSERVATION_WINDOW_DAYS = 30;
export const MILLIS_PER_DAY = 24 * 60 * 60 * 1000;
export const MIN_OBSERVED_USE_DAYS_FOR_PROFILE = 4;

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

export interface ObservedPattern {
  /** Distinct use days in the last 30 local days. */
  readonly useDaysLast30: number;
  /** Total sessions in the window / use days, rounded; null below 1. */
  readonly sessionsPerUseDay: number | null;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly lastUseAt: Instant | null;
  /** True when tracked events span >= 30 days, so the 30-day use-day count is
   * derived from exact data rather than a lower-bound estimate. */
  readonly hasFullThirtyDayCoverage: boolean;
  /** True when the observed window has enough use days (>= 4) to build a
   * tolerance-v3 profile without the user re-estimating frequency. */
  readonly sufficientForProfile: boolean;
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
  return dayKeyForInstant(toInstant(asUtcMidnight - daysAgo * MILLIS_PER_DAY), utcOffsetMinutes);
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
 * Product heuristic for starting limits based on the user's estimated
 * current pattern. Transparent, bounded, editable, never presented as a
 * medical recommendation. The day cap aims at roughly half of the current
 * weekly use-day rate, clamped to 1..7; the session cap is 1 when the current
 * pattern has more than one session on a use day, otherwise the user is free
 * to choose. When the current pattern is already below these suggestions the
 * heuristic returns a cap equal to the current rate (never harsher than the
 * user's own pattern without consent).
 */
export function suggestedReductionLimits(
  baseline: Pick<ReductionBaseline, 'thcUseDaysLast30' | 'sessionsPerUseDay'>,
): ReductionLimits {
  const currentWeeklyRate = Math.max(1, Math.ceil((baseline.thcUseDaysLast30 / 30) * 7));
  const suggestedDays = Math.max(1, Math.min(7, Math.ceil(currentWeeklyRate / 2)));
  const suggestedSessions =
    baseline.sessionsPerUseDay === null || baseline.sessionsPerUseDay > 1 ? 1 : 1;
  return {
    maxUseDaysPerWeek: suggestedDays,
    maxSessionsPerUseDay: suggestedSessions,
  };
}

/**
 * Observed pattern from exact tracked events (last 30 local days). Distinguishes
 * what the tracker knows exactly from what is still an estimate.
 */
export function observedPattern(
  events: readonly UseEvent[],
  now: Instant,
  utcOffsetMinutes: number,
): ObservedPattern {
  const windowEvents = eventsInWindow(events, now, utcOffsetMinutes, REDUCTION_OBSERVATION_WINDOW_DAYS);
  const daySet = new Set(windowEvents.map((event) => dayKeyOfEvent(event, utcOffsetMinutes)));
  const useDaysLast30 = daySet.size;
  const totalSessions = windowEvents.length;
  const sessionsPerUseDay =
    useDaysLast30 === 0
      ? null
      : Math.max(1, Math.min(9, Math.round(totalSessions / useDaysLast30)));
  const productSet = new Set<ProductKind>();
  const routeSet = new Set<Route>();
  for (const event of windowEvents) {
    productSet.add(event.product);
    routeSet.add(event.route);
  }
  const products = [...productSet];
  const routes = [...routeSet];
  const lastUseAt =
    windowEvents.length === 0
      ? null
      : toInstant(Math.max(...windowEvents.map((event) => event.usedAt)));
  const oldestObserved = events.length === 0 ? null : Math.min(...events.map((event) => event.usedAt));
  const hasFullThirtyDayCoverage =
    oldestObserved !== null && now - oldestObserved >= REDUCTION_OBSERVATION_WINDOW_DAYS * MILLIS_PER_DAY;
  return {
    useDaysLast30,
    sessionsPerUseDay,
    products,
    routes,
    lastUseAt,
    hasFullThirtyDayCoverage,
    sufficientForProfile: useDaysLast30 >= MIN_OBSERVED_USE_DAYS_FOR_PROFILE,
  };
}

/**
 * True when an observed pattern differs from the current tolerance profile's
 * inputs in a way that could change a v3 recommendation. Used to decide
 * whether an adaptive recalculation would create a *different* result (and so
 * a new history record) instead of churning identical ones.
 */
export function observedDiffersFromBaseline(
  observed: ObservedPattern,
  baseline: ReductionBaseline,
): boolean {
  const baselineDays = baseline.thcUseDaysLast30;
  const bandOf = (days: number): number => {
    if (days === 0) return 0;
    if (days <= 3) return 1;
    if (days <= 15) return 2;
    if (days <= 25) return 3;
    return 4;
  };
  if (bandOf(observed.useDaysLast30) !== bandOf(baselineDays)) return true;
  const observedSessions = observed.sessionsPerUseDay ?? baseline.sessionsPerUseDay ?? 0;
  const baselineSessions = baseline.sessionsPerUseDay ?? 0;
  const observedHigh = observedSessions >= 2;
  const baselineHigh = baselineSessions >= 2;
  if (observedHigh !== baselineHigh) return true;
  if (observed.products.includes('concentrate') !== baseline.products.includes('concentrate')) return true;
  if (observed.routes.includes('dabbing') !== baseline.routes.includes('dabbing')) return true;
  return false;
}

/** Validates a candidate tolerance profile range is inside the evidence
 * bounds; helper for tests that prove recalculation never exceeds 28. */
export function rangeWithinEvidenceBounds(range: RecommendedRangeDays | null): boolean {
  if (range === null) return true;
  return range.min >= 2 && range.max <= 28 && range.min <= range.max;
}
