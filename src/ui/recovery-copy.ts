// Static, reviewed copy for Recovery Outlook v1/v2.

import type { RecoveryWordingKey } from '../domain/recovery/recovery-outlook.ts';

export const RESET_MODE = {
  plan: 'Your plan',
  reset: 'Predicted reset',
  historicalContext: 'Predicted reset (historical context)',
} as const;

export const RESET_PANEL = {
  predictionTitle: 'Likely tolerance recovery window',
  disclaimer:
    'An evidence-informed product estimate of when tolerance may approach a near-maximal reduction relative to your current pattern — not a guaranteed complete reset.',
  planningCardTitle: 'Your plan',
  planningCardLiveNote:
    'The deterministic tolerance-v3 recommendation for a practical break. It remains separate from the predicted recovery window.',
  planningCardFrozenNote:
    'Your saved practical break target. It remains separate from the predicted recovery window.',
  planningCardLegacyNote:
    'Your saved target from the policy used at the time. It is shown exactly as stored.',
  rangeCardTitle: 'Plan evidence range',
  rangeCardNote: 'The broad planning interval used by tolerance-v3; it never exceeds 28 days.',
  referenceCardTitle: 'Human CB1 reference',
  referenceValue: 'About 4 weeks (Day 28)',
  referenceNotes: [
    'Small human PET studies found CB1 availability changed during monitored abstinence and was near or not statistically distinguishable from control values by about four weeks in many regions.',
    'This population reference is not a personal target, a measure of subjective tolerance, or proof of complete recovery.',
  ],
  extendedHeading: 'Extended recovery',
  extendedBody:
    'For this frequent or daily pattern with high intensity and/or long duration, meaningful tolerance-related adaptation may continue beyond the four-week human CB1 reference. Evidence for the extended part of this window is less direct.',
  lightReferenceNote:
    'The four-week study reference comes mainly from chronic daily users. It does not mean your shorter predicted window should be extended to Day 28.',
  wording: {
    light_or_regular:
      'Your profile-sensitive prediction remains relatively short. Longer breaks may reduce tolerance further, but the chronic-use PET reference is not your predicted endpoint.',
    heavy_target_below_reference:
      'Your practical plan can be shorter than the broader recovery estimate because the two answer different questions.',
    heavy_reaches_reference:
      'Your practical plan reaches the four-week human reference; the recovery estimate may still be wider when the profile meets an explicit extended rule.',
  } satisfies Record<RecoveryWordingKey, string>,
  timelineCaption: 'This timeline shows time since last use — never a recovery percentage.',
  historyHeading: 'Your history',
  historyHelper:
    'Your recorded experience is shown separately. In v2 it does not change the numeric predicted window.',
  checkinsHeading: 'From your recorded check-ins',
} as const;

export const RESET_V1_PANEL = {
  disclaimer:
    'This historical v1 outlook used Day 28 as a fixed biological reference, not as a guaranteed complete-reset day.',
  planningCardTitle: 'Your saved planning target',
  rangeCardTitle: 'Your saved evidence range',
  referenceCardTitle: 'Biological reference',
  referenceValue: 'Around four weeks (Day 28)',
  referenceNote:
    'V1 presented the strongest human CB1 reference used at the time and did not produce a separate profile-sensitive recovery window.',
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

export const RESET_EVIDENCE = {
  summary: 'What informs this estimate?',
  extendedSummary: 'Why can recovery extend beyond four weeks?',
  directHeading: 'Direct human reference',
  dsouzaTitle: "D'Souza et al. (human PET)",
  dsouzaBody:
    'Eleven cannabis-dependent men were scanned at baseline, Day 2 and Day 28. Baseline CB1 availability was about 15% lower than controls; group differences were no longer statistically evident at Days 2 or 28, while within-user increases continued over time. The sample was small, and “not statistically different” does not prove a plateau or complete normalization.',
  hirvonenTitle: 'Hirvonen et al. (human PET)',
  hirvonenBody:
    'Thirty chronic daily male users were scanned, with 14 rescanned after 13–32 days of monitored abstinence. Cortical CB1 availability increased toward control values, while the hippocampus was an exception. PET receptor availability was not a subjective THC-response test.',
  extendedHeading: 'Extended recovery evidence',
  extendedBody:
    'Human evidence beyond four weeks is sparse and does not directly measure return of subjective tolerance. The six-week outer bound is therefore a conservative product heuristic: human PET leaves the post-four-week trajectory uncertain, while animal work shows regional CB1 recovery can continue for weeks and one mouse hippocampal study reported incomplete restoration at about 11.5 days and restoration by six weeks.',
  indirectBody:
    'Withdrawal, sleep and cognitive studies provide context that recovery can be uneven, but these endpoints are not treated as direct measures of tolerance and do not set the window.',
  notHeading: 'What this does not mean',
  baseNotPoints: [
    'The predicted window is not scientifically proven as a complete reset.',
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
