// Structural copy for the break loop (UX_SPEC §§3.2, 8, 9.8, 10).
// Mandated sentences come verbatim from the spec sections quoted in the
// comments. No scientific, medical, detox, or safety claims are invented.

import type { PostBreakMode } from '../domain/schemas/enums.ts';
import { POST_BREAK_MODES } from '../domain/schemas/enums.ts';

// --- Break-start sheet (UX_SPEC 8) -----------------------------------------

export const BREAK_START = {
  title: 'Start your break',
  startQuestion: 'When do you want to start?',
  startNow: 'Now',
  startNowHelper: 'Your plan starts immediately',
  startNowHelperClockRunning: 'Commit now — the day count still runs from your last use',
  startPick: 'Pick a date',
  modeQuestion: "After this break, what's your plan?",
  helper: 'Nothing is locked in — you can change this in the plan later.',
  startBreak: 'Start break',
  close: 'Close break start',
} as const;

export const POST_BREAK_MODE_COPY: ReadonlyArray<{ id: PostBreakMode; title: string; helper?: string }> = [
  { id: 'continue_abstinence', title: 'Stay off THC' },
  { id: 'occasional', title: 'Occasional use', helper: 'Weekends or special occasions' },
  { id: 'reduced_regular_use', title: 'Regular use, but less than before' },
  { id: 'undecided', title: 'Not sure yet' },
];

/** Clock note shown in the sheet when the abstinence clock already runs
 * (UX_SPEC 2/8): the plan begins at "Day N of target". When N is already
 * past the planning target, say so plainly so Day N of M does not look broken. */
export function clockAlreadyRunningNote(day: number, targetDays?: number): string {
  if (targetDays !== undefined && day > targetDays) {
    return `Your clock is already at day ${day} — that's past the ${targetDays}-day planning target. You can mark the plan complete as soon as you start.`;
  }
  return `Your clock is already at day ${day} — your target date counts from your last use.`;
}

// --- Plan surface (UX_SPEC 10.1) -------------------------------------------

export const PLAN_DETAIL = {
  title: 'Your break',
  back: 'Back to Today',
  progressLabel: 'Plan progress',
  targetDateLabel: 'Target date',
  phaseHeading: 'Phase focus',
  postBreakHeading: 'After this break',
  settingsHelper: BREAK_START.helper,
  markComplete: 'Mark complete',
  more: 'More',
  endEarly: 'End break early',
  recalculate: 'Recalculate profile',
  endEarlyConfirmTitle: 'End your break early?',
  endEarlyConfirmBody: 'Ending early closes this plan without a completion state. Your progress stays in your history.',
  cancelPlanTitle: 'Cancel scheduled break?',
  cancelPlanBody: 'This break has not started yet. Cancelling removes the plan and keeps your saved result.',
  confirm: 'Confirm',
  cancel: 'Keep plan',
} as const;

export const PLANNED_CARD = {
  eyebrow: 'Planned',
  startsLabel: 'Break starts',
  viewPlan: 'View plan',
} as const;

// --- Post-break plan (UX_SPEC 8, 10) ---------------------------------------

/** Mandated leading messages on every post-break surface with a return mode. */
export const POST_BREAK_MESSAGES = {
  lowerTolerance: 'Your tolerance may be lower than before the break.',
  notASafeRestartAmount: 'Your previous amount is not a safe restart amount.',
} as const;

export const POST_BREAK_GUIDANCE = [
  'Prefer lower potency where practical',
  'Go slow with concentrates',
  'Edibles take longer to take effect',
] as const;

export const POST_BREAK_SETTINGS = {
  maxDaysWeek: 'Max use days per week',
  maxSessions: 'Max sessions on a use day',
  potencyStrategy: 'Potency',
  quantityStrategy: 'Amount per session',
} as const;

export const POTENCY_STRATEGY_OPTIONS = [
  { id: 'lower', title: 'Lower' },
  { id: 'same', title: 'Same' },
  { id: 'mixed', title: 'Mixed' },
] as const;

export const QUANTITY_STRATEGY_OPTIONS = [
  { id: 'smaller', title: 'Smaller' },
  { id: 'same', title: 'Same' },
] as const;

// --- Check-in (UX_SPEC 10.2) -----------------------------------------------

export const CHECKIN = {
  title: 'Check-in',
  question: 'Any THC since your last check-in?',
  no: 'No',
  noHelper: "I haven't used",
  yes: 'Yes',
  yesHelper: 'I used THC',
  save: 'Save',
  addSymptoms: "Add how you're feeling",
  symptomsTitle: 'How are you feeling?',
  symptomsHelper: 'optional — skip any',
  noteLabel: 'Note (optional)',
  noteHelper: 'Private, stored only on this device, never analysed.',
  close: 'Close check-in',
  backToQuestion: 'Back',
} as const;

export const SYMPTOM_FIELDS = [
  { id: 'craving', label: 'Craving', zero: 'None', ten: 'Overwhelming' },
  { id: 'sleep', label: 'Sleep quality', zero: 'Terrible', ten: 'Great' },
  { id: 'irritability', label: 'Irritability', zero: 'Calm', ten: 'Very irritable' },
  { id: 'anxiety', label: 'Anxiety', zero: 'None', ten: 'Severe' },
  { id: 'appetite', label: 'Appetite', zero: 'None', ten: 'Normal / strong' },
] as const;

// --- Interruption (UX_SPEC 10.3) -------------------------------------------

export const INTERRUPTION = {
  title: 'When did you use?',
  helper: 'A rough answer is fine — the calculator works in whole days.',
  paused: 'Timing is paused until you confirm.',
  confirm: 'Confirm',
  close: 'Close',
  back: 'Back',
  dateHelper: 'Pick a time after your last confirmed check-in. It cannot be in the future.',
} as const;

/** Mandated restart phrasing (UX_SPEC 10.3.2), finite break. */
export const RESTART_COPY_BREAK =
  'Plan restarted from your latest use. Day counters now run from the new date. Your earlier check-ins and progress stay in your history. This restarts the plan clock — it doesn\u2019t claim your body\u2019s recovery went back to zero.';

/** Honest restart phrasing for open-ended tracking (UX_SPEC 9.8): same
 * mechanics minus any target-date language. */
export const RESTART_COPY_TRACKING =
  'Restarted from your latest use. Day counters now run from the new date. Your earlier check-ins stay in your history. This restarts your timeline — it doesn\u2019t claim your body\u2019s recovery went back to zero.';

export const RESTART_RECALCULATE = 'Your use pattern may have changed — recalculate';
export const RESTART_DONE = 'Done';

// --- Today states (UX_SPEC 3.2) --------------------------------------------

export const ACTIVE_BREAK_CARD = {
  eyebrow: 'Your break',
  targetDateLabel: 'Target date',
  checkIn: 'Check in',
  viewPlan: 'Plan detail',
  withdrawalHeading: 'First weeks',
  phaseHeading: 'Phase focus',
} as const;

export const INTERRUPTED_CARD = {
  title: 'Break paused',
  titleTracking: 'Tracking paused',
  planBody: 'You marked that you used THC. Confirm when, so your plan can restart.',
  trackingBody: 'You marked that you used THC. Confirm when, so your timeline can restart.',
  confirmWhen: 'Confirm when',
  pausedLabel: 'Timing paused',
} as const;

export const COMPLETED_CARD = {
  done: 'Done',
  completeLabel: 'Break complete',
  postBreakHeading: 'What next',
} as const;

export function completedBreakTitle(days: number): string {
  return `Break complete — ${days} days`;
}

export const TRACKING_CARD = {
  eyebrow: 'Staying off THC',
  sinceLabel: 'since your last use',
  checkIn: 'Check in',
  stop: 'Stop tracking',
  stopConfirmTitle: 'Stop tracking?',
  stopConfirmBody: 'Stopping ends this timeline. Your history stays on this device.',
} as const;

export function trackingDayTitle(day: number): string {
  return `Day ${day}`;
}

// --- Profile-no-break card variants -----------------------------------------

export const PROFILE_NO_BREAK = {
  eyebrow: 'Your result',
  startThisBreak: 'Start this break',
  viewResult: 'View result',
  recalculate: 'Recalculate',
  keepTracking: 'Keep tracking',
  startTracking: 'Start tracking',
  seeBreakRange: 'See your break range',
  saved: 'Your calculation is saved on this device.',
} as const;

export const MODE_ORDER: readonly PostBreakMode[] = POST_BREAK_MODES;
