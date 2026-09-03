// Adaptive tolerance recalculation from tracked use (CALCULATOR_SPEC §10).
//
// The reduction tracker never converts "one dab = +N break days". Instead,
// when real logged use changes the exposure pattern, the app re-runs the full
// tolerance engine on an observed profile and freezes a NEW calculation
// record, leaving the previous recommendation in History.
//
// Provenance is explicit:
// - `baseline` is the user's estimate from the questionnaire;
// - tracked events after tracking starts are exact;
// - until tracked history spans 30 days, the observed 30-day use-day count is
//   only a lower bound, so the app never silently fabricates a 30-day profile.
//
// Deterministic decision procedure:
//   1. Derive the observed pattern from events over the last 30 local days.
//   2. If the observed pattern is not an escalation over the baseline and the
//      profile inputs still match, do nothing (`unchanged`).
//   3. With full 30-day coverage and a real difference, rebuild the profile
//      from exact events (`recalculated`).
//   4. With partial coverage, an apparent change may be an artefact of the
//      partial window. If the observed evidence points UP (more use days in a
//      higher frequency band, or new intensity signals), ask for a minimal
//      prefilled profile refresh instead of inventing data (`needs_refresh`).
//   5. With full coverage and zero use days in the window, the user has been
//      abstaining; emit the baseline-low outcome (`abstinent`).

import {
  MIN_OBSERVED_USE_DAYS_FOR_PROFILE,
  observedPattern,
  type ObservedPattern,
  type ReductionBaseline,
  type UseEvent,
} from '../../domain/reduction/reduction-engine.ts';
import type { CurrentPatternDurationBand } from '../../domain/schemas/enums.ts';
import type { UseProfileInput } from '../../domain/schemas/profile.ts';
import type { Instant } from '../../domain/schemas/time.ts';
import { PRODUCT_KIND_ORDER, ROUTE_ORDER } from '../../domain/schemas/enums.ts';

export type RecalculationMode = 'unchanged' | 'needs_refresh' | 'recalculated' | 'abstinent';

export interface RecalculationDecision {
  readonly mode: RecalculationMode;
  /** Profile to run when mode is `recalculated`. Null otherwise. */
  readonly profile: UseProfileInput | null;
}

function canonicalOrder<T extends string>(items: readonly T[], order: readonly T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const candidate of order) {
    for (const item of items) {
      if (item === candidate && !seen.has(item)) {
        seen.add(item);
        result.push(item);
      }
    }
  }
  return result;
}

function bandOf(useDays: number): number {
  if (useDays === 0) return 0;
  if (useDays <= 3) return 1;
  if (useDays <= 15) return 2;
  if (useDays <= 25) return 3;
  return 4;
}

/** True when the observed pattern indicates escalation that a partial tracking
 * window cannot have invented (higher frequency band or new intensity). */
function isEscalation(observed: ObservedPattern, baseline: ReductionBaseline): boolean {
  if (bandOf(observed.useDaysLast30) > bandOf(baseline.thcUseDaysLast30)) return true;
  const observedSessions = observed.sessionsPerUseDay ?? 0;
  const baselineSessions = baseline.sessionsPerUseDay ?? 0;
  if ((observedSessions >= 2) !== (baselineSessions >= 2)) return true;
  if (observed.products.includes('concentrate') && !baseline.products.includes('concentrate')) return true;
  if (observed.routes.includes('dabbing') && !baseline.routes.includes('dabbing')) return true;
  return false;
}

export interface TrackingRecalculationInput {
  /** The profile of the latest tolerance_result calculation record. */
  readonly latestProfile: UseProfileInput;
  /** The plan's original user-estimated baseline. */
  readonly baseline: ReductionBaseline;
  readonly events: readonly UseEvent[];
  readonly now: Instant;
  readonly utcOffsetMinutes: number;
}

export function decideTrackingRecalculation(
  input: TrackingRecalculationInput,
): RecalculationDecision {
  const { latestProfile, baseline, events, now, utcOffsetMinutes } = input;
  const observed = observedPattern(events, now, utcOffsetMinutes);
  const coverage = observed.hasFullThirtyDayCoverage;
  if (!coverage) {
    if (isEscalation(observed, baseline)) {
      // Partial window but clear upward evidence: ask for a minimal refresh so
      // the exact 30-day profile is not fabricated.
      return { mode: 'needs_refresh', profile: null };
    }
    return { mode: 'unchanged', profile: null };
  }
  // Full coverage: counts are exact.
  if (observed.useDaysLast30 === 0) {
    return { mode: 'abstinent', profile: null };
  }
  const differs =
    bandOf(observed.useDaysLast30) !== bandOf(baseline.thcUseDaysLast30) ||
    (observed.sessionsPerUseDay ?? 0) !== (baseline.sessionsPerUseDay ?? 0) ||
    observed.products.includes('concentrate') !== baseline.products.includes('concentrate') ||
    observed.routes.includes('dabbing') !== baseline.routes.includes('dabbing');
  if (!differs) return { mode: 'unchanged', profile: null };
  return {
    mode: 'recalculated',
    profile: observedProfileInput(latestProfile, observed, baseline.currentPatternDuration),
  };
}

/**
 * Builds a validated use-profile input from exact tracked events plus the
 * still-relevant estimated context (goal, breakRequested, duration band and
 * previous-break list are carried over from the latest calculation).
 */
export function observedProfileInput(
  latestProfile: UseProfileInput,
  observed: ObservedPattern,
  durationBand: string | null,
): UseProfileInput {
  const productPayload = { value: observed.products as never[], provenance: 'user_estimate' as const };
  const routePayload = { value: observed.routes as never[], provenance: 'user_estimate' as const };
  return {
    goal: latestProfile.goal,
    breakRequested: latestProfile.breakRequested,
    postBreakMode: latestProfile.postBreakMode,
    thcUseDaysLast30: { value: observed.useDaysLast30, provenance: 'user_estimate' },
    sessionsPerUseDay:
      observed.sessionsPerUseDay === null
        ? { value: null, provenance: 'missing' }
        : { value: observed.sessionsPerUseDay, provenance: 'user_estimate' },
    products: canonicalOrder(observed.products, PRODUCT_KIND_ORDER) as UseProfileInput['products'],
    routes: canonicalOrder(observed.routes, ROUTE_ORDER) as UseProfileInput['routes'],
    lastUseAt:
      observed.lastUseAt === null
        ? { value: null, provenance: 'missing' }
        : { value: new Date(observed.lastUseAt).toISOString(), provenance: 'user_estimate' },
    currentPatternDuration:
      durationBand === null
        ? undefined
        : { value: durationBand as CurrentPatternDurationBand, provenance: 'user_estimate' },
    previousBreaks: [...latestProfile.previousBreaks],
  };
}

/** True when a rebuilt observed profile would pass engine validation. */
export function observedProfileMeetsMinimumCoverage(observed: ObservedPattern): boolean {
  return observed.useDaysLast30 >= MIN_OBSERVED_USE_DAYS_FOR_PROFILE;
}
