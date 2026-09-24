import type { SupportArea } from '../application/questionnaire/companion.ts';

export interface SupportAreaCopy {
  readonly label: string;
  readonly shortLabel: string;
}

export const SUPPORT_AREA_COPY: Record<SupportArea, SupportAreaCopy> = {
  anxiety: { label: 'Anxiety or racing thoughts', shortLabel: 'Anxiety' },
  irritability: { label: 'Irritability or short temper', shortLabel: 'Irritability' },
  low_mood: { label: 'Low mood or feeling flat', shortLabel: 'Low mood' },
  sleep: { label: 'Sleep or winding down', shortLabel: 'Sleep' },
  dreams: { label: 'Vivid dreams', shortLabel: 'Dreams' },
  cravings: { label: 'Cravings in the moment', shortLabel: 'Cravings' },
  routine: { label: 'Breaking the usual routine', shortLabel: 'Routine' },
  boredom: { label: 'Boredom or filling idle time', shortLabel: 'Boredom' },
  appetite: { label: 'Appetite or eating changes', shortLabel: 'Appetite' },
  nausea: { label: 'Stomach discomfort or nausea', shortLabel: 'Nausea' },
  headaches: { label: 'Headaches', shortLabel: 'Headaches' },
};

/** The support sheet: the topics the person asks the app to help with. Kept
 * beside the area taxonomy so the labels and the sheet cannot drift apart. */
export const SUPPORT_SHEET = {
  title: 'What would you like help with?',
  intro: 'These are the areas you want help with during this break. They take turns one day at a time in Help with, and you can open any guide at any time.',
  /** Shown when the sheet opens on a list kept from an earlier break. */
  carried: 'These are the topics from your last break, already selected. Save them to use them again on this one.',
  empty: 'Nothing chosen yet. Today keeps its own suggestion for the stage of the break.',
  save: 'Save topics',
  back: 'Back',
  footerLink: 'Support topics',
  /** The sheet's own header, above the question. */
  flowTitle: 'Support topics',
  /** Help with, when this break has its own topics. */
  turns: 'Your topics take turns, one each day.',
  /** Help with, when this break has none of its own. */
  askChoose: 'No topics chosen for this break.',
  askChooseCta: 'Choose topics',
  reuse: (labels: string) => `Last break’s topics: ${labels}.`,
  reuseCta: 'Use these',
  reuseChange: 'Change',
} as const;

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
