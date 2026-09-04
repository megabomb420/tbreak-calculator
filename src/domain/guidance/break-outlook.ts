// BreakOutlookV1 architecture — deterministic per-day guidance from Day 1
// through the planning target (content version break-outlook-v2). Result,
// Today, and Plan Detail all read this module.
//
// Authoritative research source:
//   "THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA"
//
// Windows overlap on purpose. This layer does not invent exclusive
// day-specific biology, recovery percentages, or a duration-to-days formula.
// Numeric ranges stay in the Tolerance Engine / tolerance-v2 policy.

import type { CurrentPatternDurationBand, ProductKind, Route } from '../schemas/enums.ts';
import type { UseProfileInput } from '../schemas/profile.ts';
import {
  hasIntensitySignal,
  intensitySignalsFor,
} from '../policies/tolerance-policy-v3.ts';
import {
  milestonesForDay,
  primaryWindowForDay,
  primaryWindowIdForDay,
  windowsContainingDay,
  type EvidenceKind,
  type MilestoneContent,
  type WithdrawalWindowId,
} from './evidence-guidance-v1.ts';

export const BREAK_OUTLOOK_VERSION = 'break-outlook-v2' as const;

export type ExposureTone = 'lighter' | 'typical' | 'heavier';

export interface ExposureContext {
  readonly useDaysLast30: number | null;
  readonly sessionsPerUseDay: number | null;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly currentPatternDuration: CurrentPatternDurationBand | null;
}

export interface DayOutlook {
  readonly day: number;
  readonly primaryWindowId: WithdrawalWindowId;
  readonly windowIds: readonly WithdrawalWindowId[];
  readonly stageLabel: string;
  readonly headline: string;
  readonly kind: EvidenceKind;
  readonly mayNotice: readonly string[];
  readonly canHelp: readonly string[];
  readonly whatMatters: string;
  readonly comesNext: string | null;
  readonly milestone: MilestoneContent | null;
  readonly tone: ExposureTone;
}

export interface BreakOutlook {
  readonly version: typeof BREAK_OUTLOOK_VERSION;
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly tone: ExposureTone;
  readonly days: readonly DayOutlook[];
  readonly personalisationNote: string | null;
}

const WHAT_MATTERS: Readonly<Record<Exclude<WithdrawalWindowId, 'preparation'>, string>> = {
  days_1_3:
    'Keep meals, hydration, and sleep timing regular, and reduce avoidable triggers. Withdrawal may begin, but it may not.',
  days_2_6:
    'Symptoms often peak during this period. Stronger craving or discomfort does not show whether the plan is succeeding or failing.',
  days_7_14:
    'Acute symptoms commonly ease here. Feeling better is not the same as finishing a tolerance goal.',
  days_14_21:
    'Focus on habits, cues, and automatic thoughts rather than expecting another acute wave.',
  days_21_28:
    'Treat approximately four weeks as a research reference in chronic users — not a personal reset day.',
  beyond_28:
    'Further days can support habit change or continued abstinence. The app does not assign an extra reset percentage.',
};

const LIGHTER_EARLY =
  'For a lighter or infrequent pattern, noticeable withdrawal is less typical — you may notice little.';
const HEAVIER_EARLY =
  'With a frequent, multiple-session, concentrate, or long-established pattern, stronger withdrawal may be more plausible.';
const HEAVIER_SLEEP =
  'Sleep disruption can last longer than other acute symptoms, especially in heavier or longer-established patterns.';

export function exposureFromProfile(profile: UseProfileInput): ExposureContext {
  return {
    useDaysLast30: profile.thcUseDaysLast30.value,
    sessionsPerUseDay: profile.sessionsPerUseDay.value,
    products: profile.products,
    routes: profile.routes,
    currentPatternDuration: profile.currentPatternDuration?.value ?? null,
  };
}

export function exposureTone(context: ExposureContext): ExposureTone {
  const days = context.useDaysLast30;
  const duration = context.currentPatternDuration;
  const longEstablished = duration === '2_to_5_years' || duration === '5_plus_years';
  const shortPattern = duration === 'under_1_month' || duration === '1_to_6_months';
  const concentrateOrDab =
    context.products.includes('concentrate') || context.routes.includes('dabbing');
  // Tolerance-v3 intensity signals (multiple sessions, concentrates, dabbing)
  // shape the exposure profile from 4 use-days upward, so the outlook tone
  // uses the same signals rather than the old >= 16 use-day gate.
  const intensity =
    days !== null &&
    days >= 4 &&
    hasIntensitySignal(intensitySignalsFor(context.sessionsPerUseDay, context.products, context.routes));

  if (intensity || (days !== null && days >= 16 && longEstablished) || (days !== null && days >= 26)) {
    return 'heavier';
  }
  if (days !== null && days >= 1 && days <= 3 && !concentrateOrDab && (shortPattern || duration === null)) {
    return 'lighter';
  }
  return 'typical';
}

export function personalisationNote(context: ExposureContext, tone: ExposureTone): string | null {
  if (tone === 'lighter') {
    return 'Severe withdrawal is less common with a lighter or infrequent pattern. You may notice little.';
  }
  if (tone === 'heavier') {
    const recent =
      context.currentPatternDuration === 'under_1_month' || context.currentPatternDuration === '1_to_6_months';
    if (recent) {
      return 'A recent but high-frequency or high-intensity pattern may still bring stronger withdrawal or longer sleep disturbance. This is not a personal prediction.';
    }
    return 'A frequent, multiple-session, concentrate, or long-established pattern may bring stronger withdrawal or longer sleep disturbance. This is not a personal prediction.';
  }
  if (context.currentPatternDuration === '2_to_5_years' || context.currentPatternDuration === '5_plus_years') {
    return 'This pattern has lasted for years, so it is treated as heavier exposure context. That is not a biological prediction.';
  }
  if (context.currentPatternDuration === '6_to_24_months') {
    return 'This pattern has lasted about 1–2 years. That shapes the plan but is not a biological prediction.';
  }
  if (context.currentPatternDuration === '1_to_6_months' || context.currentPatternDuration === 'under_1_month') {
    return 'This pattern is relatively recent. That shapes the plan but is not a biological prediction.';
  }
  return null;
}

export const LAST_PLANNED_DAY_NEXT =
  'This is the last planned day. You can complete or extend the plan; it is not a biological finish line.';

export function outlookDayCount(input: {
  readonly targetDays: number | null;
  readonly openEnded: boolean;
}): number {
  if (input.openEnded || input.targetDays === null) return 28;
  if (!Number.isInteger(input.targetDays) || input.targetDays < 1) {
    throw new RangeError(`outlook targetDays must be a positive integer, got ${input.targetDays}`);
  }
  return input.targetDays;
}

export function deriveDayOutlook(day: number, tone: ExposureTone): DayOutlook {
  if (!Number.isInteger(day) || day < 1) {
    throw new RangeError(`outlook day must be an integer >= 1, got ${day}`);
  }
  const window = primaryWindowForDay(day);
  const containing = windowsContainingDay(day);
  const overlay = toneOverlay(window.id, tone);
  const mayNotice = overlay === null ? window.mayNotice : [overlay, ...window.mayNotice];
  const whatMatters =
    window.id === 'preparation' ? window.headline : WHAT_MATTERS[window.id];
  return {
    day,
    primaryWindowId: window.id,
    windowIds: containing.map((item) => item.id),
    stageLabel: window.label,
    headline: window.headline,
    kind: window.kind,
    mayNotice,
    canHelp: window.canHelp,
    whatMatters,
    comesNext: window.comesNext,
    milestone: milestonesForDay(day)[0] ?? null,
    tone,
  };
}

export function deriveBreakOutlook(input: {
  readonly targetDays: number | null;
  readonly openEnded: boolean;
  readonly exposure: ExposureContext;
}): BreakOutlook {
  const tone = exposureTone(input.exposure);
  const count = outlookDayCount({ targetDays: input.targetDays, openEnded: input.openEnded });
  const days: DayOutlook[] = [];
  for (let day = 1; day <= count; day += 1) {
    const outlook = deriveDayOutlook(day, tone);
    if (input.targetDays !== null && day === input.targetDays && !input.openEnded) {
      days.push({
        ...outlook,
        comesNext: LAST_PLANNED_DAY_NEXT,
      });
    } else {
      days.push(outlook);
    }
  }
  return {
    version: BREAK_OUTLOOK_VERSION,
    targetDays: input.openEnded ? null : input.targetDays,
    openEnded: input.openEnded,
    tone,
    days,
    personalisationNote: personalisationNote(input.exposure, tone),
  };
}

export function windowIdsOverlappingSpan(
  fromDay: number,
  toDay: number,
  options: { readonly openEnded?: boolean } = {},
): readonly WithdrawalWindowId[] {
  const ids: WithdrawalWindowId[] = [];
  const seen = new Set<WithdrawalWindowId>();
  for (let day = fromDay; day <= toDay; day += 1) {
    for (const window of windowsContainingDay(day)) {
      if (seen.has(window.id)) continue;
      seen.add(window.id);
      ids.push(window.id);
    }
  }
  if ((options.openEnded === true || toDay >= 29) && !seen.has('beyond_28')) {
    ids.push('beyond_28');
  }
  return ids;
}

export function primaryWindowId(day: number): WithdrawalWindowId {
  return primaryWindowIdForDay(day);
}

function toneOverlay(windowId: WithdrawalWindowId, tone: ExposureTone): string | null {
  if (tone === 'lighter' && (windowId === 'days_1_3' || windowId === 'days_2_6')) {
    return LIGHTER_EARLY;
  }
  if (tone === 'heavier' && (windowId === 'days_1_3' || windowId === 'days_2_6')) {
    return HEAVIER_EARLY;
  }
  if (tone === 'heavier' && (windowId === 'days_7_14' || windowId === 'days_21_28')) {
    return HEAVIER_SLEEP;
  }
  return null;
}
