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
  historyHeading: 'Your history',
  historyPrompt:
    'Taken a tolerance break before? You can add a past break later — it never changes this range.',
  detectionBasics: 'Separate topic: drug-test detection basics →',
  breakRecommendation: 'Tolerance is a separate topic → get a break recommendation',
  nominalThc: 'Estimate nominal THC in flower →',
  withdrawalHeader: 'Typical patterns across people — not a personal prediction.',
  sleepCopy: "Sleep can take longer to normalise for heavier users — there's no fixed end date.",
  abstinenceTitle: 'Staying off THC — your plan.',
  reductionTitle: 'Cutting down — without a full break.',
  reductionBody:
    'Set your own weekly limit, favour lower potency, avoid rapid repeat dosing, and remember that edibles take longer to take effect.',
  reductionSoft:
    'A full break resets tolerance faster than cutting down — see your break range.',
  abstinenceTodayBody:
    "There's no end date to chase — start tracking if you want a daily check-in.",
  unavailableTitle: 'This calculation is unavailable.',
  unavailableBody: 'The saved answers could not produce a result. You can start the questionnaire again.',
  startOver: 'Start over',
  whatHelpsHeading: 'What actually helps',
  contextHeading: 'Situation note',
  matrixHeading: 'This test type',
  limitsHeading: 'Your limits',
  maxDaysWeek: 'Max use days per week',
  maxSessions: 'Max sessions on a use day (optional)',
} as const;

export function reductionDaysLine(days: number): string {
  return days === 1 ? 'Up to 1 use day a week' : `Up to ${days} use days a week`;
}

export function reductionSessionsLine(sessions: number): string {
  return sessions === 1 ? 'Up to 1 session on a use day' : `Up to ${sessions} sessions on a use day`;
}

export const WITHDRAWAL_STOP_LABELS = {
  onset: 'Onset (≈ days 1–3)',
  common_peak: 'Common peak (≈ days 2–6)',
  substantial_improvement: 'Most acute symptoms ease (≈ days 4–14)',
  sleep_disturbance: 'Sleep',
} as const;

export function recommendedBreakTitle(min: number, max: number): string {
  return `Your recommended break: ${min}–${max} days`;
}

export function planForTarget(days: number): string {
  return `Plan for ${days} days — the top of your range.`;
}

export function aroundDay(breakDay: number): string {
  return `You're around day ${breakDay}`;
}

export function daysSince(breakDay: number): string {
  return `${breakDay} days since your last use.`;
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
