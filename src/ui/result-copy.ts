// Structural result-screen copy from UX_SPEC §9. Scientific sentences come
// from the §14 template layer, not from here.

export const RESULT = {
  close: 'Close result',
  saveWithoutStarting: 'Save without starting',
  startThisBreak: 'Start this break',
  startTracking: 'Start tracking',
  keepTracking: 'Keep tracking',
  done: 'Done',
  checkAnotherTest: 'Check another test type',
  seeBreakRange: 'See your break range',
  edit: 'Edit',
  answersHeading: 'Your answers',
  whyHeading: 'Why this result',
  outlookHeading: 'Your break outlook',
  outlookHelper: 'Every planned day, from population evidence — not a personal prediction.',
  outlookSwipe: 'Swipe the days to inspect the rest of the plan.',
  outlookMore: 'What you may notice and what can help',
  whatMatters: 'What matters today',
  historyHeading: 'Your history',
  historyPrompt:
    'Add a past tolerance break so future results can show what your history suggests.',
  addPastBreak: 'Add a past break',
  recalculateWithHistory: 'Recalculate with history',
  historicalNote: 'This is the result that was calculated at the time. It is not recalculated.',
  detectionBasics: 'Separate topic: drug-test detection basics →',
  breakRecommendation: 'Tolerance is a separate topic → get a break recommendation',
  nominalThc: 'Estimate nominal THC in flower →',
  withdrawalHeader: 'Typical patterns across people — not a personal prediction.',
  sleepCopy: "Sleep can take longer to normalise for heavier users — there's no fixed end date.",
  abstinenceTitle: 'Staying off THC — your plan.',
  reductionTitle: 'Cutting down — without a full break.',
  reductionBody:
    'Set weekly limits in advance. Favour lower potency, avoid rapid repeat dosing, and allow for the delayed onset of edibles.',
  reductionSoft:
    'You can also plan a full break as part of cutting down.',
  abstinenceTodayBody:
    'Open-ended tracking adds a daily check-in without setting an end date.',
  unavailableTitle: 'This calculation is unavailable.',
  unavailableBody: 'The saved answers could not produce a result. You can start the questionnaire again.',
  startOver: 'Start over',
  whatHelpsHeading: 'What actually helps',
  contextHeading: 'Situation note',
  matrixHeading: 'This test type',
  limitsHeading: 'Your limits',
  maxDaysWeek: 'Max use days per week',
  maxSessions: 'Max sessions on a use day (optional)',
  startReductionPlan: 'Start your cut-down plan',
  reductionRecalculated: 'Your break recommendation was updated from your tracked use.',
  reductionRefreshed: 'Break recommendation refreshed from your updated pattern.',
} as const;

export function reductionDaysLine(days: number): string {
  return days === 1 ? 'Up to 1 use day a week' : `Up to ${days} use days a week`;
}

export function reductionSessionsLine(sessions: number): string {
  return sessions === 1 ? 'Up to 1 session on a use day' : `Up to ${sessions} sessions on a use day`;
}

/** Shared copy for the "Your plan" result lens. Used by both the live result
 * overlay and the saved-result card on Today so the two always speak about
 * the one planning target with the same vocabulary. */
export const PLAN_LENS = {
  eyebrow: 'Your practical plan',
  summary: 'Your target within the recommended range.',
} as const;

export const WITHDRAWAL_STOP_LABELS = {
  onset: 'Onset (≈ days 1–3)',
  common_peak: 'Common peak (≈ days 2–6)',
  substantial_improvement: 'Most acute symptoms ease (≈ days 4–14)',
  sleep_disturbance: 'Sleep',
} as const;

export function recommendedBreakTitle(min: number, max: number): string {
  return `Your recommended break: ${min}–${max} days`;
}

export function planForTarget(days: number, range?: { readonly min: number; readonly max: number }): string {
  const base = `Plan for ${days} days`;
  if (range !== undefined) {
    if (days >= range.max) return `${base} — the top of your range.`;
    if (days <= range.min) return `${base} — the lower end of your range.`;
  }
  return `${base}.`;
}

/** Aria/text label for the result hero: the actionable planning target. */
export function planHeroLabel(days: number): string {
  return `Plan for ${days} days`;
}

/** Secondary line under the hero naming the broad evidence range explicitly. */
export function evidenceRangeLine(min: number, max: number): string {
  return `Planning range: ${min}–${max} days`;
}

export function aroundDay(breakDay: number): string {
  return `You're around day ${breakDay}`;
}

export function daysSince(breakDay: number): string {
  return `Day ${breakDay} since your last use.`;
}

export const NOMINAL_THC = {
  title: 'Nominal THC in your flower',
  intro: 'This estimates the THC contained in the plant material itself.',
  amount: 'Amount of flower',
  potency: 'THC strength (%)',
  fromLabel: 'From the label',
  myEstimate: 'My estimate',
  helper: 'Check the packaging if you have it. An estimate is fine.',
  calculate: 'Calculate',
  close: 'Close nominal THC',
} as const;
