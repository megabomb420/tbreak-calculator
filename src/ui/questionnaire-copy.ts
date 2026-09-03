// Authoritative questionnaire copy from UX_SPEC §5.2 / §4.3.
// No scientific, medical, detox, or safety claims are invented here.

import type { CurrentPatternDurationBand, DetectionContext, DetectionMatrix, ProductKind, Route } from '../domain/schemas/enums.ts';
import type { QuestionnaireStepId } from '../application/questionnaire/engine.ts';
import type { DateChipId, DayPart } from '../application/questionnaire/date-answers.ts';
import type { SupportFocus } from '../application/questionnaire/companion.ts';
import { SUPPORT_FOCUS_COPY } from './companion-copy.ts';

export const QUESTIONNAIRE = {
  close: 'Close questionnaire',
  continue: 'Continue',
  back: 'Back',
  skip: 'Skip',
  stillUseToday: 'I still use — today is day 1',
  pickADate: 'Pick a date',
  lastUseWindowWarning: "That date doesn't fit your updated answer — pick a date within the last 30 days.",
  lastUseOlderWarning: "That date doesn't fit your updated answer — pick a date older than 30 days.",
  dateHelper: 'A rough answer is fine — the calculator works in whole days.',
  flowerThcLink: "Know your flower's strength? Estimate its nominal THC →",
  sessionsValue: 'Sessions',
} as const;

export interface StepCopy {
  readonly title: string;
  readonly helper?: string;
}

export const STEP_COPY: Record<QuestionnaireStepId, StepCopy> = {
  Q1: { title: 'What do you want to do?' },
  Q2R: {
    title: 'Do you want to take a full break as part of cutting down?',
    helper: 'You can change this later.',
  },
  Q2: {
    title: 'In the last 30 days, on how many days did you use THC?',
    helper: 'Count any day you used, even once. A rough number is all the calculator uses.',
  },
  Q3: {
    title: 'When did you last use THC?',
    helper: 'A rough answer is fine — the calculator works in whole days.',
  },
  'Q3-opt': {
    title: 'When was your last use?',
    helper: "Adds a 'days since' counter to your result. Skip if you don't remember.",
  },
  Q2A: {
    title: 'When did you last use THC?',
    helper: "If you're quitting now, pick today — your timeline starts from here.",
  },
  Q6: {
    title: 'How long has this level of THC use been typical for you?',
    helper: 'Not how long you have ever used — how long this current pattern has been your usual level.',
  },
  Q7: {
    title: 'What would you most like help with?',
    helper: 'This personalises your plan and daily guidance. It does not change the recommended days.',
  },
  Q4: {
    title: 'On a day you used, how many separate sessions?',
    helper: 'One session = one sitting. Morning plus evening is 2.',
  },
  Q5: {
    title: 'What have you been using, and how?',
    helper: 'Pick all that apply.',
  },
  Q2D: {
    title: 'Which kind of test are you asking about?',
    helper: "Not sure? Pick one to see its basics — you can check the others after.",
  },
  Q3D: {
    title: "What's the situation?",
    helper: 'This only changes which notes we show you — it never changes the science.',
  },
};

export const BREAK_OPTIONS = [
  { value: true, title: 'Yes', helper: 'Plan a complete break' },
  { value: false, title: 'Not now', helper: 'I just want to reduce' },
] as const;

export const USE_DAY_PRESETS = [
  { label: 'None (0)', value: 0 },
  { label: 'Rarely (1–3)', value: 2 },
  { label: 'Weekends (≈8)', value: 8 },
  { label: 'Most days (25)', value: 25 },
  { label: 'Daily (30)', value: 30 },
] as const;

export const DATE_CHIP_LABELS: Record<DateChipId, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  days_2_3: '2–3 days ago',
  about_a_week: 'About a week ago',
  about_2_weeks: 'About 2 weeks ago',
  about_a_month: 'About a month ago',
};

export const DAY_PART_LABELS: Record<DayPart, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
};

export const MATRIX_OPTIONS: ReadonlyArray<{ id: DetectionMatrix; title: string }> = [
  { id: 'urine', title: 'Urine' },
  { id: 'blood', title: 'Blood' },
  { id: 'oral_fluid', title: 'Saliva (oral fluid)' },
  { id: 'hair', title: 'Hair' },
];

export const CONTEXT_OPTIONS: ReadonlyArray<{ id: DetectionContext; title: string }> = [
  { id: 'general', title: 'Just curious / general' },
  { id: 'workplace', title: 'Workplace testing' },
  { id: 'roadside', title: 'Roadside / driving' },
];

export const PRODUCT_OPTIONS: ReadonlyArray<{ id: ProductKind; title: string; helper?: string }> = [
  { id: 'flower', title: 'Flower (bud)' },
  { id: 'concentrate', title: 'Concentrates', helper: 'wax, shatter, resin' },
  { id: 'vape', title: 'Vape (cart / pod / disposable)' },
  { id: 'edible', title: 'Edibles' },
  { id: 'oil', title: 'Oils / tinctures' },
  { id: 'other', title: 'Something else' },
];

export const ROUTE_OPTIONS: ReadonlyArray<{ id: Route; title: string }> = [
  { id: 'smoking', title: 'Smoking' },
  { id: 'vaping', title: 'Vaping' },
  { id: 'dabbing', title: 'Dabbing' },
  { id: 'oral', title: 'Eating or drinking' },
  { id: 'sublingual', title: 'Under the tongue' },
  { id: 'other', title: 'Other way' },
];

export const PATTERN_DURATION_OPTIONS: ReadonlyArray<{
  id: CurrentPatternDurationBand;
  title: string;
  helper: string;
}> = [
  { id: 'under_1_month', title: 'Less than 1 month', helper: 'This level is still new' },
  { id: '1_to_6_months', title: '1–6 months', helper: 'A few months at this level' },
  { id: '6_to_24_months', title: '6–24 months', helper: 'About 1–2 years at this level' },
  { id: '2_to_5_years', title: '2–5 years', helper: 'A few years at this level' },
  { id: '5_plus_years', title: '5+ years', helper: 'This has been typical for a long time' },
];

export const SUPPORT_FOCUS_OPTIONS: ReadonlyArray<{
  id: SupportFocus;
  title: string;
}> = (Object.keys(SUPPORT_FOCUS_COPY) as SupportFocus[]).map((id) => ({
  id,
  title: SUPPORT_FOCUS_COPY[id].label,
}));

export const SESSION_CHIPS = [
  { label: '1', value: 1 },
  { label: '2', value: 2 },
  { label: '3+', value: 3 },
] as const;

export const PRODUCT_GROUP_LABEL = 'Products';
export const ROUTE_GROUP_LABEL = 'How you take it';
