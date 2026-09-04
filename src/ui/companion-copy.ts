import type { SupportArea } from '../application/questionnaire/companion.ts';

export interface SupportAreaCopy {
  readonly label: string;
  readonly shortLabel: string;
  readonly planLead: string;
  readonly todayAction: string;
  readonly preparation: string;
}

export const SUPPORT_AREA_COPY: Record<SupportArea, SupportAreaCopy> = {
  sleep: {
    label: 'Sleep or winding down',
    shortLabel: 'Sleep',
    planLead: 'Protect a repeatable wind-down instead of chasing perfect sleep.',
    todayAction: 'Choose a realistic sleep and wake time, then keep the hour before bed simple.',
    preparation: 'Decide what replaces THC in the hour before bed.',
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
  mood: {
    label: 'Mood or irritability',
    shortLabel: 'Mood',
    planLead: 'Leave extra room around the parts of the day that already feel demanding.',
    todayAction: 'Lower one avoidable demand and pause before acting on a sharp mood shift.',
    preparation: 'Tell one trusted person that you may want a little more space or patience.',
  },
  anxiety: {
    label: 'Anxiety or restlessness',
    shortLabel: 'Anxiety & restlessness',
    planLead: 'Give restless energy somewhere simple and predictable to go.',
    todayAction: 'Choose one short grounding or movement break you can repeat if restlessness rises.',
    preparation: 'Pick a low-effort calming activity and keep it easy to start.',
  },
  appetite: {
    label: 'Appetite, nausea or stomach discomfort',
    shortLabel: 'Appetite & stomach',
    planLead: 'Make ordinary food easy to reach even if appetite changes.',
    todayAction: 'Set up one simple meal or snack before you need to decide what to eat.',
    preparation: 'Keep a few familiar, easy foods available for the early days.',
  },
  dreams: {
    label: 'Vivid dreams',
    shortLabel: 'Dreams',
    planLead: 'Expect dreams to feel different without treating every vivid night as a setback.',
    todayAction: 'Keep the morning after a vivid night gentle and jot down anything you want out of your head.',
    preparation: 'Leave a note app or notebook ready for vivid dreams, then move on with the morning.',
  },
  physical_discomfort: {
    label: 'Headache or physical discomfort',
    shortLabel: 'Physical discomfort',
    planLead: 'Keep basic comfort measures easy to reach and avoid overloading the day.',
    todayAction: 'Prioritise water, a regular meal and one comfortable low-effort activity today.',
    preparation: 'Set up water, simple food and a low-demand fallback for an uncomfortable day.',
  },
  not_sure: {
    label: 'I’m not sure yet',
    shortLabel: 'Start simple',
    planLead: 'Start with routine, meals, and sleep; adjust when you see what actually feels hard.',
    todayAction: 'Keep today ordinary: one regular meal, a clear evening plan, and a steady bedtime.',
    preparation: 'Notice the first moment you automatically reach for the old routine.',
  },
};

export function supportAreaCopy(area: SupportArea): SupportAreaCopy {
  return SUPPORT_AREA_COPY[area];
}

export function effectiveSupportAreas(areas: readonly SupportArea[]): readonly SupportArea[] {
  return areas.length === 0 ? ['not_sure'] : areas.slice(0, 2);
}
