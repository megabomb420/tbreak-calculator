import type { SupportArea } from '../application/questionnaire/companion.ts';

export interface SupportAreaCopy {
  readonly label: string;
  readonly shortLabel: string;
  readonly planLead: string;
  readonly todayAction: string;
  readonly preparation: string;
}

export const SUPPORT_AREA_COPY: Record<SupportArea, SupportAreaCopy> = {
  anxiety: {
    label: 'Anxiety or racing thoughts',
    shortLabel: 'Anxiety',
    planLead: 'Give anxious thoughts somewhere to land before they spiral.',
    todayAction: 'Keep today regular: normal meals, a short walk, and a set sleep time.',
    preparation: 'Decide one grounding routine you can start when your mind speeds up.',
  },
  irritability: {
    label: 'Irritability or short temper',
    shortLabel: 'Irritability',
    planLead: 'Leave extra room around moments that already feel demanding.',
    todayAction: 'Lower one avoidable demand and pause before acting on a sharp mood shift.',
    preparation: 'Tell one trusted person you may want a little more space or patience.',
  },
  low_mood: {
    label: 'Low mood or feeling flat',
    shortLabel: 'Low mood',
    planLead: 'Keep small, easy wins in reach when motivation dips.',
    todayAction: 'Keep one small routine going today — a meal, a walk, or a task — even if it feels flat.',
    preparation: 'Pick one tiny activity that reliably gives you even a small lift.',
  },
  sleep: {
    label: 'Sleep or winding down',
    shortLabel: 'Sleep',
    planLead: 'Protect a repeatable wind-down instead of chasing perfect sleep.',
    todayAction: 'Choose a realistic sleep and wake time, then keep the hour before bed simple.',
    preparation: 'Decide what replaces THC in the hour before bed.',
  },
  dreams: {
    label: 'Vivid dreams',
    shortLabel: 'Dreams',
    planLead: 'Expect dreams to feel different without treating every vivid night as a setback.',
    todayAction: 'After a vivid night, keep the morning ordinary and move on with the day.',
    preparation: 'Leave a note app or notebook ready for vivid dreams, then move on with the morning.',
  },
  cravings: {
    label: 'Cravings in the moment',
    shortLabel: 'Cravings',
    planLead: 'Make the next craving easier to outlast before it arrives.',
    todayAction: 'Move one strong trigger out of reach and choose a short fallback activity now.',
    preparation: 'Write one if–then response for the time you most often use.',
  },
  routine: {
    label: 'Breaking the usual routine',
    shortLabel: 'Routine',
    planLead: 'Replace the familiar cue, not just the THC.',
    todayAction: 'Change one use-linked part of today—place, timing, or the activity around it.',
    preparation: 'Choose a specific replacement for your usual use window.',
  },
  boredom: {
    label: 'Boredom or filling idle time',
    shortLabel: 'Boredom',
    planLead: 'Plan the empty windows before they tempt you.',
    todayAction: 'Line up one hands-on task for your most predictable idle stretch.',
    preparation: 'Pick a short, absorbing alternative for the moment you would usually reach for THC.',
  },
  appetite: {
    label: 'Appetite or eating changes',
    shortLabel: 'Appetite',
    planLead: 'Make ordinary food easy to reach even if appetite changes.',
    todayAction: 'Set up one simple meal or snack before you need to decide what to eat.',
    preparation: 'Keep a few familiar, easy foods available for the early days.',
  },
  nausea: {
    label: 'Stomach discomfort or nausea',
    shortLabel: 'Nausea',
    planLead: 'Keep things gentle: small, plain food and slow hydration.',
    todayAction: 'Eat something small and plain, and sip water through the day instead of gulping.',
    preparation: 'Stock a few plain, easy-to-stomach foods and keep water close.',
  },
  headaches: {
    label: 'Headaches',
    shortLabel: 'Headaches',
    planLead: 'Take tension off early: water, rest, and a pause from bright screens.',
    todayAction: 'Drink some water, step away from bright screens for a bit, and rest if you can.',
    preparation: 'Keep a quiet, dim space ready for the times headaches tend to hit.',
  },
};

export const SUPPORT_AREA_GROUPS: ReadonlyArray<{
  readonly id: string;
  readonly label: string;
  readonly areas: readonly SupportArea[];
}> = [
  { id: 'mind', label: 'Mind & mood', areas: ['anxiety', 'irritability', 'low_mood'] },
  { id: 'sleep', label: 'Sleep', areas: ['sleep', 'dreams'] },
  { id: 'habits', label: 'Cravings & habits', areas: ['cravings', 'routine', 'boredom'] },
  { id: 'body', label: 'Body', areas: ['appetite', 'nausea', 'headaches'] },
];

/** Neutral fallback for an empty support list ("no specific focus"). */
export const GENERAL_SUPPORT_COPY: SupportAreaCopy = {
  label: 'No specific focus yet',
  shortLabel: 'Start simple',
  planLead: 'Start with routine, meals, and sleep; adjust when you see what actually feels hard.',
  todayAction: 'Keep today ordinary: one regular meal, a clear evening plan, and a steady bedtime.',
  preparation: 'Notice the first moment you automatically reach for the old routine.',
};

export function supportAreaCopy(area: SupportArea): SupportAreaCopy {
  return SUPPORT_AREA_COPY[area];
}

export interface SupportAreasView {
  readonly primary: SupportAreaCopy;
  readonly areas: readonly SupportArea[];
}

export function supportAreasView(
  areas: readonly SupportArea[] | null | undefined,
): SupportAreasView {
  const list = areas ?? [];
  return {
    primary: list[0] === undefined ? GENERAL_SUPPORT_COPY : SUPPORT_AREA_COPY[list[0]],
    areas: list,
  };
}
