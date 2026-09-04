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
    planLead: 'Plan one simple response for anxious or racing thoughts.',
    todayAction: 'Keep meals and sleep timing regular. Use a familiar activity when thoughts race.',
    preparation: 'Choose one simple activity for moments when thoughts speed up.',
  },
  irritability: {
    label: 'Irritability or short temper',
    shortLabel: 'Irritability',
    planLead: 'Patience may be lower during the first days.',
    todayAction: 'Reduce avoidable friction and pause before responding when irritation rises.',
    preparation: 'Decide where you can take a short pause if irritability rises.',
  },
  low_mood: {
    label: 'Low mood or feeling flat',
    shortLabel: 'Low mood',
    planLead: 'Keep one basic daily routine in place if motivation drops.',
    todayAction: 'Keep one regular meal, walk, or task in today’s routine.',
    preparation: 'Choose one manageable activity to keep in the day.',
  },
  sleep: {
    label: 'Sleep or winding down',
    shortLabel: 'Sleep',
    planLead: 'Keep sleep and wake times reasonably regular.',
    todayAction: 'Use a realistic sleep and wake time, and keep the hour before bed simple.',
    preparation: 'Decide what replaces THC in the hour before bed.',
  },
  dreams: {
    label: 'Vivid dreams',
    shortLabel: 'Dreams',
    planLead: 'Vivid dreams can occur when sleep changes during a break.',
    todayAction: 'If dreams disrupted sleep, keep the usual wake time where practical.',
    preparation: 'Keep the same wind-down plan even if dreams become vivid.',
  },
  cravings: {
    label: 'Cravings in the moment',
    shortLabel: 'Cravings',
    planLead: 'Choose the response to a craving before it appears.',
    todayAction: 'Reduce one avoidable trigger and choose a short alternative now.',
    preparation: 'Set one if-then response for the time you most often use.',
  },
  routine: {
    label: 'Breaking the usual routine',
    shortLabel: 'Routine',
    planLead: 'Change the routine linked to THC use.',
    todayAction: 'Change one use-linked part of today — place, timing, or the activity around it.',
    preparation: 'Choose a specific replacement for your usual use window.',
  },
  boredom: {
    label: 'Boredom or filling idle time',
    shortLabel: 'Boredom',
    planLead: 'Plan an alternative for predictable idle time.',
    todayAction: 'Choose one specific task for the time when boredom usually leads to THC.',
    preparation: 'Pick a short activity for the time you would usually use THC.',
  },
  appetite: {
    label: 'Appetite or eating changes',
    shortLabel: 'Appetite',
    planLead: 'Keep regular food available if appetite changes.',
    todayAction: 'Prepare one simple meal or snack in advance.',
    preparation: 'Keep a few familiar, easy foods available for the early days.',
  },
  nausea: {
    label: 'Stomach discomfort or nausea',
    shortLabel: 'Nausea',
    planLead: 'Keep normal hydration and simple food available.',
    todayAction: 'Keep water and a simple meal or snack within reach.',
    preparation: 'Have familiar, easy-to-eat food and water available.',
  },
  headaches: {
    label: 'Headaches',
    shortLabel: 'Headaches',
    planLead: 'Keep normal hydration and note when headaches occur.',
    todayAction: 'Drink normally and take a short break if a headache appears.',
    preparation: 'Keep water available and plan a short pause if needed.',
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
  planLead: 'Start with regular meals, sleep timing, and one alternative to THC.',
  todayAction: 'Keep one regular meal, a clear evening plan, and a steady bedtime.',
  preparation: 'Identify the first time of day usually linked to THC use.',
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
