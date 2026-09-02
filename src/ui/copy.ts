// User-facing copy for this slice. Scientific/message-code sentences live in
// UX_SPEC §14 and MUST NOT be invented here. First-launch and shell strings
// are taken from UX_SPEC §3; later-slice screens use structural labels only.

import type { TodayPrimaryState } from '../application/shell/today-state.ts';

export const APP_NAME = 'T-Break Calculator';
export const APP_SHORT_NAME = 'T-Break';

export const FIRST_LAUNCH = {
  title: APP_NAME,
  promise:
    'A private, on-device planner for tolerance breaks, cutting down, staying off, and drug-test basics.',
  reassurances: [
    { id: 'offline', label: 'Works offline' },
    { id: 'local', label: 'Stored only on this device' },
    { id: 'no-account', label: 'No account needed' },
  ],
  cta: 'Get started',
  // UX_SPEC §3.3: the block ships in place; reviewed wording is a release
  // blocker and is not invented here.
  safetyPending:
    'Reviewed safety and eligibility copy is not available yet and is not shown.',
} as const;

export const GOAL_CHIPS = [
  { id: 'tolerance_reset', title: 'Reset my tolerance', helper: 'Feel THC strongly again' },
  { id: 'reduction', title: 'Cut down', helper: 'Reduce how much I use' },
  { id: 'abstinence', title: 'Stay off THC', helper: "I'm quitting or already have" },
  { id: 'detection_information', title: 'Drug test info', helper: 'Understand detection basics' },
] as const;

export const NO_PROFILE = {
  title: 'What do you want to do?',
} as const;

export const HISTORY_EMPTY = 'No history yet.';

export const SETTINGS = {
  title: 'Settings',
  close: 'Close settings',
  installHelpTitle: 'Install on this device',
  installIos: 'iPhone / iPad: in Safari, tap Share, then Add to Home Screen.',
  installAndroid: 'Android: open the browser menu and tap Install app or Add to Home Screen.',
  installDesktop: 'Desktop: use the install icon in the address bar, or Install app in the browser menu.',
  offlineNote: 'Fully offline-capable · all data on this device',
  deleteTitle: 'Delete everything',
  deleteHint: 'Hold for 3 seconds to confirm. This removes all data stored on this device.',
  deleteHoldLabel: 'Hold to delete everything',
} as const;

export const OPEN_SETTINGS = 'Settings';

export function resumeTitle(answeredSteps: number): string {
  return `Finish your calculation — ${answeredSteps} answers saved`;
}

export const RESUME = {
  resume: 'Resume',
  startOver: 'Start over',
} as const;

export interface DeferredShellCopy {
  readonly title: string;
  readonly body: string;
  readonly cta?: string;
}

/** Structural shells for Today states whose full screens belong to later slices.
 * No ranges, day counters, percentages, or engine-derived numbers. */
export const DEFERRED_TODAY_SHELL: Record<
  Exclude<TodayPrimaryState, 'first-launch' | 'no-profile'>,
  DeferredShellCopy
> = {
  'profile-no-break': {
    title: 'Your saved result',
    body: 'Your calculation is saved on this device.',
    cta: 'Start this break',
  },
  'active-break': {
    title: 'Your break',
    body: 'Your current break is in progress.',
    cta: 'Check in',
  },
  interrupted: {
    title: 'Break paused',
    body: 'You marked that you used THC. Confirm when, so your plan can restart.',
    cta: 'Confirm when',
  },
  'completed-break': {
    title: 'Break complete',
    body: 'This break has reached its planning target.',
  },
  'abstinence-tracking': {
    title: 'Staying off THC',
    body: 'Tracking since your last use is active.',
    cta: 'Check in',
  },
  'detection-only': {
    title: 'Detection information',
    body: 'Your last detection information is saved on this device.',
    cta: 'Get a break recommendation',
  },
};
