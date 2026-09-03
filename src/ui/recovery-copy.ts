// User-facing copy for the 0.9.0 recovery outlook / "Predicted reset" panel.
//
// This module intentionally lives outside `result-copy.ts`: the reviewed reset
// wording states explicitly that 28 days is "not a 100% reset", and the
// copy-safety scan over `result-copy.ts` forbids numeric percentages there.
// Research sentences below come from the project source material only (see
// `src/domain/recovery/recovery-outlook.ts` header); no study facts or
// citation metadata are invented here.

import type { RecoveryWordingKey } from '../domain/recovery/recovery-outlook.ts';

export const RESET_MODE = {
  plan: 'Your plan',
  reset: 'Predicted reset',
  /** Lead label used only for frozen pre-v3 (v1/v2) historical records. */
  historicalContext: 'Predicted reset (historical context)',
} as const;

export const RESET_PANEL = {
  /** Always-visible lead under the reset segment. */
  disclaimer:
    'An evidence-informed estimate, not a guaranteed day of complete tolerance reset.',
  planningCardTitle: 'Your planning target',
  planningCardUnit: 'Day',
  planningCardLiveNote:
    'Your current plan target — the deterministic tolerance-v3 planning recommendation for this profile. It is not a claim that biological recovery ends on this day.',
  planningCardFrozenNote:
    'Your saved planning target — a deterministic planning recommendation, not a claim that biological recovery ends on this day.',
  planningCardLegacyNote:
    'Your saved planning target from an earlier policy version, shown exactly as stored. It is not a claim that biological recovery ends on this day.',
  rangeCardTitle: 'Your evidence range',
  rangeCardNote: 'The broad planning interval used by the existing calculator.',
  referenceCardTitle: 'Biological reference',
  referenceValue: 'Around four weeks (Day 28)',
  referenceNotes: [
    'Around four weeks is the strongest human PET reference the app uses for CB1 availability returning toward control levels in chronic users.',
    'It is not proof of a 100% reset: PET receptor availability is not the same as subjective THC tolerance, and the evidence comes mainly from chronic or heavy users. A light or regular user is not being told they need a 28-day break.',
  ],
  wording: {
    light_or_regular:
      'Your plan aims for a meaningful tolerance reduction appropriate to your current pattern. Going longer may lower tolerance further, but the four-week PET reference is not evidence that you personally need a 28-day break.',
    heavy_target_below_reference:
      'Your plan reaches the lower part of the strongest evidence window for chronic exposure. Continuing toward four weeks reaches the strongest human CB1 reference used by the app.',
    heavy_reaches_reference:
      'Your 28-day planning target also reaches the strongest human biological reference used by the app.',
  } satisfies Record<RecoveryWordingKey, string>,
  timelineCaption:
    'This timeline shows TIME since last use — not a percentage of recovery.',
  historyHeading: 'Your history',
  historyHelper:
    'Your own recorded experience, separate from the population research.',
  checkinsHeading: 'From your recorded check-ins',
} as const;

/** Factual per-observation history line; 8/10 is never shown as 80%. */
export function resetHistoryLine(durationDays: number, score: number): string {
  return `Your previous ${durationDays}-day break was rated ${score}/10 for tolerance reduction.`;
}

export const RESET_HISTORY_RAISED =
  'Your planning target also reflects a previous break inside this range that you rated as more effective.';

/** Milestone row day prefix: Day 0 is the last-use marker itself. */
export function resetMilestoneDayLabel(day: number): string {
  return day === 0 ? 'Last use' : `Day ${day}`;
}

// --- Evidence disclosure (D'Souza / Hirvonen PET anchors) -------------------

export const RESET_EVIDENCE = {
  summary: 'Why four weeks?',
  dsouzaTitle: "D'Souza et al. (PET)",
  dsouzaBody:
    '11 cannabis-dependent men were scanned with PET. Their baseline CB1 availability was about 15% lower than controls; after about 2 days of monitored abstinence the group difference was no longer statistically visible, and no group difference was seen after about 28 days. It is a small study, and receptor availability is not a direct measure of how strong THC will feel.',
  hirvonenTitle: 'Hirvonen et al. (PET)',
  hirvonenBody:
    'Chronic daily users showed regional CB1 downregulation, and binding returned toward control levels after about four weeks of monitored abstinence.',
  notHeading: 'What this does NOT mean',
  notPoints: [
    '28 days is not a guaranteed 100% reset.',
    'Receptor availability is not the same as subjective tolerance.',
    'No validated individual reset-day calculator exists.',
  ],
} as const;
