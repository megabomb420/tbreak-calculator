import type { SupportFocus } from '../application/questionnaire/companion.ts';

export interface SupportFocusCopy {
  readonly label: string;
  readonly shortLabel: string;
  readonly planLead: string;
  readonly todayAction: string;
  readonly preparation: string;
}

export const SUPPORT_FOCUS_COPY: Record<SupportFocus, SupportFocusCopy> = {
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
  appetite: {
    label: 'Appetite or regular meals',
    shortLabel: 'Appetite',
    planLead: 'Make ordinary food easy to reach even if appetite changes.',
    todayAction: 'Set up one simple meal or snack before you need to decide what to eat.',
    preparation: 'Keep a few familiar, easy foods available for the early days.',
  },
  not_sure: {
    label: 'I’m not sure yet',
    shortLabel: 'Start simple',
    planLead: 'Start with routine, meals, and sleep; adjust when you see what actually feels hard.',
    todayAction: 'Keep today ordinary: one regular meal, a clear evening plan, and a steady bedtime.',
    preparation: 'Notice the first moment you automatically reach for the old routine.',
  },
};

export function supportFocusCopy(focus: SupportFocus | null | undefined): SupportFocusCopy {
  return SUPPORT_FOCUS_COPY[focus ?? 'not_sure'];
}
