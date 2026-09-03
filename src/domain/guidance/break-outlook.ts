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
import { assessIntensity, TOLERANCE_POLICY_V2 } from '../policies/tolerance-policy-v2.ts';
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
    'Get through today with regular meals, ordinary hydration, and fewer triggers. Withdrawal may begin — it is not required.',
  days_2_6:
    'This is commonly a harder stretch. An increase in craving or discomfort does not mean the plan is failing.',
  days_7_14:
    'Acute symptoms commonly ease here. Feeling better is not the same as finishing a tolerance goal.',
  days_14_21:
    'Attention is more useful on habits, cues, and automatic thoughts than on waiting for a new acute wave.',
  days_21_28:
    'Treat approximately four weeks as a research reference in chronic users — not a personal reset day.',
  beyond_28:
    'Further days can serve habits or continued abstinence. There is no extra reset percentage.',
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
  const intensity =
    days !== null
      ? assessIntensity(TOLERANCE_POLICY_V2, days, context.sessionsPerUseDay, context.products, context.routes)
          .applies
      : false;

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
    return 'A lighter or infrequent pattern is less often associated with severe withdrawal. You may notice little. How long this pattern has lasted is useful context and does not change the recommended day range.';
  }
  if (tone === 'heavier') {
    const recent =
      context.currentPatternDuration === 'under_1_month' || context.currentPatternDuration === '1_to_6_months';
    if (recent) {
      return 'A high-frequency or high-intensity pattern can make stronger withdrawal or longer sleep disturbance more plausible, even when the pattern is recent. This is not a personal prediction, and it does not change the recommended day range.';
    }
    return 'A frequent, multiple-session, concentrate, or long-established pattern can make stronger withdrawal or longer sleep disturbance more plausible. This is not a personal prediction, and it does not change the recommended day range.';
  }
  if (context.currentPatternDuration === '2_to_5_years' || context.currentPatternDuration === '5_plus_years') {
    return 'This current pattern has been typical for years. That is useful context. It does not change the recommended day range.';
  }
  if (context.currentPatternDuration === '6_to_24_months') {
    return 'This current pattern has been typical for about 1–2 years. That is useful context. It does not change the recommended day range.';
  }
  if (context.currentPatternDuration === '1_to_6_months' || context.currentPatternDuration === 'under_1_month') {
    return 'This current pattern is relatively recent. That is useful context. It does not change the recommended day range.';
  }
  return null;
}

export const LAST_PLANNED_DAY_NEXT =
  'This is the last planned day. Completing the plan is a choice you make — not a biological percentage.';

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
