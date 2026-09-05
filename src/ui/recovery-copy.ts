// Static, reviewed copy for Recovery Outlook v1/v2.

import type { RecoveryWordingKey } from '../domain/recovery/recovery-outlook.ts';

export const RESET_MODE = {
  plan: 'Your plan',
  reset: 'Recovery outlook',
  historicalContext: 'Recovery outlook (historical context)',
} as const;

export const RESET_PANEL = {
  predictionTitle: 'Estimated recovery window',
  disclaimer:
    'An estimate from the app’s planning rules, not a clinically validated recovery window. Research cannot tell us when your tolerance will fully reset.',
  planningCardTitle: 'Your plan',
  planningCardLiveNote:
    'A practical target within the planning range. It is separate from the estimated recovery window.',
  planningCardFrozenNote:
    'Your saved practical break target. It remains separate from the estimated recovery window.',
  planningCardLegacyNote:
    'Your saved target from the policy used at the time. It is shown exactly as stored.',
  rangeCardTitle: 'Planning range',
  rangeCardNote: 'The broad planning range. It never exceeds 28 days.',
  referenceCardTitle: 'Human CB1 reference',
  referenceValue: 'About 4 weeks (Day 28)',
  referenceNotes: [
    'Small human PET studies found CB1 availability changed during monitored abstinence and was near or not statistically distinguishable from control values by about four weeks in many regions.',
    'This population reference is not a personal target, a measure of subjective tolerance, or proof of complete recovery.',
  ],
  extendedHeading: 'Extended recovery',
  extendedBody:
    'This app allows a longer estimated window for some established use patterns. Direct human tolerance studies have not validated these extra days.',
  lightReferenceNote:
    'The four-week study reference comes mainly from chronic daily users. It does not mean your shorter estimated window should be extended to Day 28.',
  wording: {
    light_or_regular:
      'Your estimated window is relatively short. The four-week PET reference comes from chronic users and is not your personal endpoint.',
    heavy_target_below_reference:
      'Your practical plan can be shorter than the broader recovery estimate because the two answer different questions.',
    heavy_reaches_reference:
      'Your practical plan reaches the four-week human reference. The broader recovery estimate may extend further for this use pattern.',
  } satisfies Record<RecoveryWordingKey, string>,
  timelineCaption: 'This timeline shows time since last use — never a recovery percentage.',
  historyHeading: 'Your history',
  historyHelper:
    'Your recorded experience is shown separately. It does not change the estimated window.',
  checkinsHeading: 'From your recorded check-ins',
} as const;

export const RESET_V1_PANEL = {
  disclaimer:
    'This older saved outlook used Day 28 as a biological reference, not a guaranteed full-reset day.',
  planningCardTitle: 'Your saved planning target',
  rangeCardTitle: 'Your saved planning range',
  referenceCardTitle: 'Biological reference',
  referenceValue: 'Around four weeks (Day 28)',
  referenceNote:
    'This saved result used the four-week CB1 reference available at the time. It did not include a separate estimated recovery window.',
} as const;

export function resetHistoryLine(durationDays: number, score: number): string {
  return `Your previous ${durationDays}-day break was rated ${score}/10 for tolerance reduction.`;
}

export const RESET_HISTORY_RAISED =
  'Your saved planning target also reflects a previous break inside its plan range that you rated as more effective.';

export function resetMilestoneDayLabel(day: number): string {
  return day === 0 ? 'Last use' : `Day ${day}`;
}

export function predictedWindowLabel(minDays: number, maxDays: number): string {
  if (minDays === 7 && maxDays === 14) return 'About 1–2 weeks';
  if (minDays === 14 && maxDays === 21) return 'About 2–3 weeks';
  if (minDays === 21 && maxDays === 28) return 'About 3–4 weeks';
  if (minDays === 28 && maxDays === 35) return 'About 4–5 weeks';
  if (minDays === 28 && maxDays === 42) return 'About 4–6 weeks';
  return `${minDays}–${maxDays} days`;
}

export function predictedWindowParts(minDays: number, maxDays: number): {
  readonly prefix?: string;
  readonly value: string;
  readonly unit: string;
} {
  if (minDays === 7 && maxDays === 14) return { prefix: 'About', value: '1–2', unit: 'weeks' };
  if (minDays === 14 && maxDays === 21) return { prefix: 'About', value: '2–3', unit: 'weeks' };
  if (minDays === 21 && maxDays === 28) return { prefix: 'About', value: '3–4', unit: 'weeks' };
  if (minDays === 28 && maxDays === 35) return { prefix: 'About', value: '4–5', unit: 'weeks' };
  if (minDays === 28 && maxDays === 42) return { prefix: 'About', value: '4–6', unit: 'weeks' };
  return { value: `${minDays}–${maxDays}`, unit: 'days' };
}

export const RESET_EVIDENCE = {
  summary: 'What informs this estimate?',
  extendedSummary: 'Why can recovery extend beyond four weeks?',
  directHeading: 'Direct human reference',
  dsouzaTitle: "D'Souza et al. (human PET)",
  dsouzaBody:
    'Eleven cannabis-dependent men were scanned at baseline, Day 2 and Day 28. CB1 availability was about 15% lower than controls at baseline. Group differences were no longer statistically evident at Days 2 or 28, but the sample was small and this does not prove complete normalization.',
  hirvonenTitle: 'Hirvonen et al. (human PET)',
  hirvonenBody:
    'Thirty chronic daily male users were scanned; 14 were rescanned after 13–32 days of monitored abstinence. Cortical CB1 availability moved toward control values, with the hippocampus as an exception. PET does not measure how strong THC feels.',
  extendedHeading: 'Extended recovery evidence',
  extendedBody:
    'Human evidence beyond four weeks is sparse and does not directly measure subjective tolerance. The six-week outer bound is a conservative product rule, not a human study result. Human PET studies leave the later trajectory uncertain; animal evidence cannot establish a human timetable.',
  indirectBody:
    'Withdrawal, sleep and cognitive studies provide context that recovery can be uneven, but these endpoints are not treated as direct measures of tolerance and do not set the window.',
  notHeading: 'What this does not mean',
  baseNotPoints: [
    'The estimated window is not scientifically proven as a complete reset.',
    'CB1 availability is not identical to subjective tolerance.',
    'This is a product heuristic, not a validated clinical model, detox estimate or drug-test prediction.',
  ],
  notPoints: [
    'The outer day is not scientifically proven as a complete reset.',
    'CB1 availability is not identical to subjective tolerance.',
    'Longer withdrawal, sleep or cognitive effects are not automatically tolerance.',
    'Animal timelines do not directly convert to human timelines.',
    'This is a conservative product heuristic, not a validated clinical model, detox estimate or drug-test prediction.',
  ],
} as const;
