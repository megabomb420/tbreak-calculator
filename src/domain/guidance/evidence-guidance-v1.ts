// EvidenceGuidanceV1 — versioned, deterministic break-companion content.
//
// Authoritative research source:
//   "THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA"
//
// This module is the only place research-derived companion copy lives.
// UI components select and render; they do not invent scientific claims.
// Numeric tolerance/detection engines are unchanged and must not read this
// file to alter bands, coefficients, or day formulae.
//
// Distinctions preserved from the source:
//   study_evidence | biological_reference | product_heuristic | unsupported_folklore
//
// Scientific prohibitions (enforced by tests):
//   no reset/detox/receptor/clean/clearance percentages
//   no guaranteed negative dates, safe restart doses, or flush multipliers

export const EVIDENCE_GUIDANCE_VERSION = 'evidence-guidance-v1' as const;

export const EVIDENCE_SOURCE = {
  title: 'THC Tolerance Break Calculator — projekt naukowo ugruntowanego PWA',
  role: 'authoritative_research_source',
  integratedAs: 'break_companion_guidance',
} as const;

export type EvidenceKind =
  | 'study_evidence'
  | 'biological_reference'
  | 'product_heuristic'
  | 'unsupported_folklore';

export type WithdrawalWindowId =
  | 'preparation'
  | 'days_1_3'
  | 'days_2_6'
  | 'days_7_14'
  | 'days_14_21'
  | 'days_21_28'
  | 'beyond_28';

export type SymptomKind = 'craving' | 'sleep' | 'irritability' | 'anxiety' | 'appetite';

export type EvidenceScaleGrade = 'A' | 'B' | 'C' | 'D';

export interface WithdrawalWindowContent {
  readonly id: WithdrawalWindowId;
  readonly label: string;
  /** Inclusive abstinence-day bounds. Null means open-ended (preparation / after 28). */
  readonly dayStart: number | null;
  readonly dayEnd: number | null;
  readonly kind: EvidenceKind;
  readonly headline: string;
  readonly mayNotice: readonly string[];
  readonly canHelp: readonly string[];
  readonly context: string;
  readonly comesNext: string | null;
  readonly whyThisMatters: string | null;
}

export interface MilestoneContent {
  readonly id: string;
  readonly day: number;
  /** Inclusive end of the day range this milestone remains relevant. */
  readonly throughDay: number;
  readonly title: string;
  readonly body: string;
  readonly kind: EvidenceKind;
}

export interface DetoxMethodContent {
  readonly id: string;
  readonly name: string;
  readonly wellbeing: 'helpful' | 'neutral' | 'not_recommended' | 'harmful_risk';
  readonly speedsThcElimination: false;
  readonly grade: EvidenceScaleGrade;
  readonly summary: string;
  readonly detail: string;
  readonly kind: EvidenceKind;
}

export interface TriggerCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly ifClause: string;
}

export interface PostBreakPrinciple {
  readonly id: string;
  readonly text: string;
  readonly kind: EvidenceKind;
}

// --- Evidence scale (app-specific; not formal GRADE) -----------------------

export const EVIDENCE_SCALE_DISCLAIMER =
  'This is an app-specific evidence scale, not formal GRADE.';

export const EVIDENCE_SCALE: Readonly<Record<EvidenceScaleGrade, string>> = {
  A: 'Strong or direct human evidence, or a well-established mechanism.',
  B: 'Limited direct human evidence.',
  C: 'Indirect, limited, or conflicting evidence.',
  D: 'No credible efficacy evidence and/or a poor evidence-to-risk balance.',
};

// --- Trigger catalog (expandable later; ids are stable) --------------------

export const TRIGGER_CATALOG_V1: readonly TriggerCatalogEntry[] = [
  { id: 'evening_after_work', label: 'Evening after work', ifClause: 'I automatically want THC after work' },
  { id: 'gaming', label: 'Gaming', ifClause: 'I automatically want THC while gaming' },
  { id: 'sleep_difficulty', label: 'Difficulty sleeping', ifClause: 'I automatically want THC because I am having trouble sleeping' },
  { id: 'weekend', label: 'Weekend', ifClause: 'I automatically want THC at the weekend' },
  { id: 'alcohol', label: 'Alcohol', ifClause: 'I automatically want THC with alcohol' },
  { id: 'boredom', label: 'Boredom', ifClause: 'I automatically want THC when I am bored' },
  { id: 'stress', label: 'Stress', ifClause: 'I automatically want THC when I am stressed' },
  { id: 'social', label: 'Around people who use', ifClause: 'I automatically want THC around people who use' },
];

export const IMPLEMENTATION_INTENTION_TEMPLATE =
  'If {ifClause}, I will first {replacement} and then reassess the craving.';

export const IMPLEMENTATION_INTENTION_FALLBACK_TEMPLATE =
  'If that is not possible, {fallback}.';

// --- Withdrawal windows (overlapping on purpose) ---------------------------
//
// Source timing (study_evidence): onset commonly 24–72 h; peak commonly days
// 2–6; most acute symptoms substantially improve across about the first two
// weeks; sleep disruption can last three to four weeks.
// Days 1–3 and 2–6 overlap. Days 7–14 and 14–21 overlap at day 14.
// Days 14–21 and 21–28 overlap at day 21. Do not collapse these into
// mutually exclusive UI phases.

export const WITHDRAWAL_WINDOWS_V1: readonly WithdrawalWindowContent[] = [
  {
    id: 'preparation',
    label: 'Preparation',
    dayStart: null,
    dayEnd: null,
    kind: 'product_heuristic',
    headline: 'A light plan before you start',
    mayNotice: [
      'You may already be thinking about when and why you usually use THC.',
    ],
    canHelp: [
      'Name one or two likely triggers.',
      'Choose a replacement activity for the time you would normally use THC.',
      'Decide a simple fallback if the replacement is not possible.',
      'You can skip this and start — it stays editable later.',
    ],
    context:
      'If-then plans (“If this trigger, then I will do this first”) are a practical way to handle automatic use cues. This is behavioural planning, not a medical intake.',
    comesNext:
      'Cannabis withdrawal may begin during the first three days after last use. Not everyone notices every symptom.',
    whyThisMatters: null,
  },
  {
    id: 'days_1_3',
    label: 'Days 1–3',
    dayStart: 1,
    dayEnd: 3,
    kind: 'study_evidence',
    headline: 'Withdrawal may begin',
    mayNotice: [
      'Craving',
      'Irritability',
      'Anxiety or tension',
      'Sleep difficulty',
      'Reduced appetite',
    ],
    canHelp: [
      'Keep sleep and wake times reasonably regular.',
      'Eat normally even if appetite is reduced.',
      'Drink to thirst — more water does not flush THC faster.',
      'Keep a simple replacement activity ready for the time you would normally use THC.',
      'Cut down on avoidable triggers for these first days.',
    ],
    context:
      'Cannabis withdrawal can begin around 24–72 hours after last use. Some people notice little; others notice several of these. None of this is required, and none of it means the break is failing.',
    comesNext:
      'Days 2–6 are commonly among the harder days. An increase in craving or discomfort then is a known pattern, not a sign that the plan has stopped working.',
    whyThisMatters: null,
  },
  {
    id: 'days_2_6',
    label: 'Days 2–6',
    dayStart: 2,
    dayEnd: 6,
    kind: 'study_evidence',
    headline: 'Common peak period',
    mayNotice: [
      'Craving may be stronger',
      'Irritability',
      'Sleep disruption',
      'Anxiety or tension',
      'Appetite changes',
    ],
    canHelp: [
      'Eat normally even if appetite is reduced.',
      'Drink to thirst.',
      'Keep sleep and wake times reasonably regular.',
      'Keep a simple replacement activity ready for the time you would normally use THC.',
      'If you made an if-then plan, use it first and then reassess the craving.',
      'Cut down on avoidable triggers while this stretch lasts.',
    ],
    context:
      'Clinical research commonly observes the greatest withdrawal intensity around days 2–6. Feeling worse during this window does not mean the break is failing. This is a population pattern, not an exact personal prediction.',
    comesNext:
      'Most acute symptoms commonly begin easing across the first two weeks. Sleep problems can last longer than the other acute symptoms.',
    whyThisMatters: null,
  },
  {
    id: 'days_7_14',
    label: 'Days 7–14',
    dayStart: 7,
    dayEnd: 14,
    kind: 'study_evidence',
    headline: 'Acute symptoms commonly ease',
    mayNotice: [
      'Craving, irritability or anxiety may be less intense than in the first week',
      'Sleep can still be disrupted',
      'Appetite may be returning',
    ],
    canHelp: [
      'Keep regular sleep and meal timing.',
      'Stay with the replacement activity at usual use times.',
      'Notice which cues still prompt a craving even as the acute wave eases.',
      'If you have a few check-ins, compare how you rated the first days with today — without treating that as a score.',
    ],
    context:
      'Most acute withdrawal symptoms commonly improve substantially across about the first two weeks. Feeling better is not the same as completing a tolerance goal. Withdrawal easing and tolerance adaptation are different processes. Sleep disruption can continue for three to four weeks.',
    comesNext:
      'Later days shift toward habits, cues and automatic thoughts about THC, more than toward a new wave of acute withdrawal.',
    whyThisMatters:
      'If your planning target is longer than two weeks, continuing can still make sense for the tolerance goal even after you feel more like yourself.',
  },
  {
    id: 'days_14_21',
    label: 'Days 14–21',
    dayStart: 14,
    dayEnd: 21,
    kind: 'product_heuristic',
    headline: 'Habits and cues',
    mayNotice: [
      'Craving without the earlier acute cluster',
      'Automatic thoughts about THC in familiar situations',
      'Evening, weekend, or other routine cues',
    ],
    canHelp: [
      'Separate habit from perceived need: notice the cue, then use the replacement first.',
      'Watch evening and weekend routines especially.',
      'Keep using your if-then plan rather than renegotiating it in the moment.',
      'This stage is not a detox protocol.',
    ],
    context:
      'As the acute wave recedes, remaining difficulty is often the old pattern — time of day, people, boredom, stress — rather than a new biological crisis. That does not mean tolerance has finished adapting.',
    comesNext:
      'Around four weeks, human CB1 imaging in chronic users is an important biological reference — not a personal reset day.',
    whyThisMatters: null,
  },
  {
    id: 'days_21_28',
    label: 'Days 21–28',
    dayStart: 21,
    dayEnd: 28,
    kind: 'biological_reference',
    headline: 'Four-week reference',
    mayNotice: [
      'Remaining sleep disruption for some people',
      'Habit cues more than acute withdrawal',
    ],
    canHelp: [
      'Keep the trigger plan in place through the familiar high-risk hours.',
      'Treat this week as a reference point, not a finish-line ceremony.',
      'If you intend to stay off, decide that as a goal of its own — not as a score.',
    ],
    context:
      'PET studies in chronic, heavy cannabis users make approximately four weeks of abstinence an important human biological reference for CB1 availability. CB1 adaptation can begin reversing earlier than four weeks. This does not prove an exact personal reset day, fully restored CB1 availability, or that subjective tolerance has returned to a pre-use baseline. Subjective response is not the same as receptor availability.',
    comesNext:
      'Further days can still serve habit change, continued abstinence, or personal goals. They are not a continuing biological reset score.',
    whyThisMatters:
      'Withdrawal easing, CB1 adaptation, how THC will feel, and whether a drug test is negative are four different questions. This week answers none of them as a percentage.',
  },
  {
    id: 'beyond_28',
    label: 'After 28 days',
    dayStart: 29,
    dayEnd: null,
    kind: 'product_heuristic',
    headline: 'Maintenance, not a score',
    mayNotice: [
      'Habit cues can still appear',
      'Craving can return in familiar situations without a new acute wave',
    ],
    canHelp: [
      'Keep using the replacement at old use times if those cues still fire.',
      'Review which triggers were hardest, and keep the fallback.',
      'If you planned a return to THC, read the post-break notes before changing course.',
    ],
    context:
      'There is no continuing biological reset percentage after four weeks. Additional abstinence can still serve behavioural goals, continued abstinence, habit change, or personal aims. Open-ended tracking has no finish line here.',
    comesNext: null,
    whyThisMatters:
      'Staying off longer is a choice about the life you want, not a way to chase a hidden recovery number.',
  },
];

export const MILESTONES_V1: readonly MilestoneContent[] = [
  {
    id: 'onset_may_begin',
    day: 1,
    throughDay: 1,
    title: 'Early days',
    body: 'Withdrawal may begin becoming noticeable over the next couple of days. You may notice none, some, or several common symptoms — that spread is expected.',
    kind: 'study_evidence',
  },
  {
    id: 'common_peak',
    day: 2,
    throughDay: 6,
    title: 'Commonly stronger period',
    body: 'Days 2–6 are commonly observed as a stronger withdrawal period. An increase in craving or discomfort here does not mean the break is failing.',
    kind: 'study_evidence',
  },
  {
    id: 'first_week',
    day: 7,
    throughDay: 7,
    title: 'First-week checkpoint',
    body: 'You are through the days that are commonly the most intense. Most acute symptoms commonly continue easing across this second week. That is not the same as finishing a tolerance goal.',
    kind: 'study_evidence',
  },
  {
    id: 'two_week',
    day: 14,
    throughDay: 14,
    title: 'Two-week checkpoint',
    body: 'Where you have check-ins from earlier days, compare those ratings with today. Improvement in acute withdrawal does not automatically mean the tolerance goal is complete.',
    kind: 'study_evidence',
  },
  {
    id: 'habit_shift',
    day: 21,
    throughDay: 21,
    title: 'Cue and habit shift',
    body: 'Attention here is more useful on triggers, evening and weekend routines, and automatic thoughts about THC than on waiting for a new acute wave.',
    kind: 'product_heuristic',
  },
  {
    id: 'four_week_cb1',
    day: 28,
    throughDay: 28,
    title: 'Four-week reference',
    body: 'Approximately four weeks is an important human biological reference from CB1 PET studies in chronic users. It is not a personal reset day and not a reason to invent a recovery percentage. Completion stays a choice you make.',
    kind: 'biological_reference',
  },
];

// --- Detox / flush evidence ------------------------------------------------

export const DETOX_FRAMING = {
  title: 'Detox claims',
  lead: 'Helpful for wellbeing is not the same as proven to speed THC elimination.',
  primary:
    'Abstinence plus time is the primary reliable basis for a declining cannabinoid burden. That is not a magic detox.',
  notAProtocol: 'This is not a flush protocol and not advice for influencing a drug test.',
} as const;

export const DETOX_METHODS_V1: readonly DetoxMethodContent[] = [
  {
    id: 'abstinence_time',
    name: 'Abstinence plus time',
    wellbeing: 'helpful',
    speedsThcElimination: false,
    grade: 'A',
    summary: 'The reliable basis for declining cannabinoid burden. Not a branded detox.',
    detail:
      'Stored cannabinoids decline with time away from THC. No tea, supplement, or sweat session in this list replaces that. The app does not turn this into a countdown to a negative test.',
    kind: 'study_evidence',
  },
  {
    id: 'normal_hydration',
    name: 'Normal hydration',
    wellbeing: 'helpful',
    speedsThcElimination: false,
    grade: 'A',
    summary: 'Drink according to thirst. More water does not mean faster THC elimination.',
    detail:
      'Ordinary drinking supports ordinary wellbeing and can change how concentrated urine is. It is not a mechanism for clearing stored THC faster.',
    kind: 'study_evidence',
  },
  {
    id: 'water_loading',
    name: 'Excessive water loading',
    wellbeing: 'harmful_risk',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'Do not do this. Dilution is not faster elimination, and excessive intake can be harmful.',
    detail:
      'Drinking far beyond thirst can dilute urine. Dilution is not the same as eliminating stored cannabinoids. This app does not give instructions for manipulating a drug test.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'exercise',
    name: 'Exercise',
    wellbeing: 'helpful',
    speedsThcElimination: false,
    grade: 'B',
    summary: 'Useful for health, routine, and replacing habitual THC time — not as a THC flush.',
    detail:
      'Newer human evidence does not support aerobic exercise as a reliable way to flush THC. This app does not award extra clearance days, a metabolism multiplier, or a detox bonus for workouts.',
    kind: 'study_evidence',
  },
  {
    id: 'sauna',
    name: 'Sauna / sweating',
    wellbeing: 'neutral',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'Not recommended as THC detox. No convincing controlled human evidence for meaningful acceleration of clearance.',
    detail:
      'Sweating is not established as a way to meaningfully speed THC elimination. It is not used here as a detox method.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'fasting',
    name: 'Fasting',
    wellbeing: 'not_recommended',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'No established THC-clearance advantage. Not recommended as a detox strategy.',
    detail:
      'The supplied research does not establish a clearance benefit from fasting. Do not skip meals as a THC flush, especially while appetite is already reduced.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'niacin',
    name: 'Niacin / high-dose vitamin B3',
    wellbeing: 'harmful_risk',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'Not recommended for THC detox. No established efficacy; high-dose use has documented toxicity.',
    detail:
      'This app does not provide doses. High-dose niacin used in attempts to influence drug testing has been associated with harm. It is not a detox method here.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'cranberry',
    name: 'Cranberry juice',
    wellbeing: 'neutral',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'No credible controlled evidence that it accelerates THC elimination.',
    detail:
      'A familiar folklore drink. It is not treated as a clearance method.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'lemon_water',
    name: 'Lemon water',
    wellbeing: 'neutral',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'No credible controlled evidence that it accelerates THC elimination.',
    detail: 'Flavouring water does not create a THC flush.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'vinegar',
    name: 'Vinegar',
    wellbeing: 'neutral',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'No credible controlled evidence that it accelerates THC elimination.',
    detail: 'Not a clearance method.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'detox_tea',
    name: 'Detox teas',
    wellbeing: 'neutral',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'No credible controlled evidence that marketed detox teas accelerate THC elimination.',
    detail:
      'Branded teas are not a substitute for abstinence plus time. This app does not rank or recommend them as flushes.',
    kind: 'unsupported_folklore',
  },
  {
    id: 'diuretics',
    name: 'Diuretics',
    wellbeing: 'not_recommended',
    speedsThcElimination: false,
    grade: 'D',
    summary: 'Not recommended as a THC flush. More urine does not mean faster clearance from tissue.',
    detail:
      'Producing more urine is not the same as reducing stored cannabinoids. This app does not recommend diuretics for detox or for a test.',
    kind: 'unsupported_folklore',
  },
];

// --- CB1 / tolerance education ---------------------------------------------

export const CB1_EDUCATION_V1 = {
  title: 'Tolerance is not a percentage',
  paragraphs: [
    'With regular THC use, CB1 availability can down-adapt. That process can begin reversing during abstinence, including earlier than four weeks.',
    'PET research in chronic, heavy cannabis users makes approximately four weeks an important human biological reference. It does not prove an exact personal reset day, and it does not mean subjective tolerance is identical to receptor availability.',
    'Feeling better after the acute withdrawal period is not the same as completing a tolerance goal, and neither is the same as a drug-test result.',
  ],
  kind: 'biological_reference' as const,
};

export const CONCEPT_DISTINCTIONS_V1 = [
  'Withdrawal — how you may feel after stopping.',
  'Tolerance — how strongly THC is likely to affect you after a break; a planning heuristic, not a lab value.',
  'CB1 adaptation — a biological reference from imaging studies, not a personal recovery meter.',
  'Detectability — whether a test at a given cutoff might still report a metabolite; not a measure of impairment or tolerance.',
  'Intoxication and impairment — present effects, not the same as a trace finding later.',
] as const;

// --- Post-break principles -------------------------------------------------

export const POST_BREAK_CORE_V1 = {
  previousIsNotRestart:
    'After a meaningful break, the old amount and pattern may feel substantially stronger. Previous exposure is not restart exposure.',
  noSafeDose: 'This app does not generate a personalised safe restart dose, milligram prescription, or universally safe inhalation count.',
  abstinenceOnly: 'You chose to stay off THC — there is no return-to-use guidance to follow.',
} as const;

export const POST_BREAK_RETURN_PRINCIPLES_V1: readonly PostBreakPrinciple[] = [
  { id: 'lower_potency', text: 'Favour lower-potency products where practical.', kind: 'study_evidence' },
  {
    id: 'concentrates',
    text: 'Be especially cautious with high-potency products and concentrates.',
    kind: 'study_evidence',
  },
  {
    id: 'less_exposure',
    text: 'Use substantially less exposure than the previous pattern.',
    kind: 'product_heuristic',
  },
  {
    id: 'no_rapid_redose',
    text: 'Avoid rapidly repeating doses before the effects are understood.',
    kind: 'study_evidence',
  },
  {
    id: 'oral_delay',
    text: 'Oral THC is delayed — wait for the effect rather than stacking.',
    kind: 'study_evidence',
  },
  {
    id: 'frequency_limit',
    text: 'Keep the use-frequency limit you set, and treat it as a ceiling rather than a target.',
    kind: 'product_heuristic',
  },
  {
    id: 'session_limit',
    text: 'Keep any session limit you set. Do not chase the old intensity.',
    kind: 'product_heuristic',
  },
  {
    id: 'escalation_triggers',
    text: 'Notice the triggers that used to escalate use, and keep the replacement plan around them.',
    kind: 'product_heuristic',
  },
];

// --- Interruption recovery (not shame, not a biological reset) -------------

export const UNPLANNED_USE_RECOVERY_V1 = {
  lead: 'Unplanned use is useful history, not a moral failure.',
  steps: [
    'If you can, note what triggered it.',
    'Return to the replacement plan at the next usual cue.',
    'The plan clock restarts from the latest use. Earlier check-ins stay in history.',
  ],
} as const;

// --- Detection education (qualitative only; not a numeric engine) ----------

export const DETECTION_EDUCATION_V1 = {
  title: 'Detection is a different question',
  lead: 'This app does not estimate a personal detection window or a guaranteed negative date.',
  points: [
    'The analytical cutoff matters a great deal — the same sample can be reported differently at different cutoffs.',
    'Urine, blood, oral fluid and hair measure different things. They are not interchangeable clocks.',
    'Urine metabolite concentrations can fluctuate during abstinence, including a later positive after a negative.',
    'A trace amount of THC in blood is not proof of current impairment.',
    'Hair reflects historical exposure rather than a simple clearance countdown.',
  ],
  deferred:
    'A richer quantitative detection engine would need its own reviewed science-policy slice. It is not hidden in this companion.',
} as const;

// --- Check-in comparison copy ----------------------------------------------

export const CHECKIN_COMPARISON_COPY = {
  title: 'Then → Now',
  helper: 'From your earliest saved rating to the most recent. Missing days are skipped, not filled in. This is not a recovery score and not proof that the break caused the change.',
  insufficient: 'Not enough check-in ratings yet to compare.',
  cravingLower: 'Craving is lower than on your earliest check-in.',
  cravingHigher: 'Craving is higher than on your earliest check-in.',
  cravingSame: 'Craving is similar to your earliest check-in.',
  sleepHigher: 'Sleep rating is higher than near the start.',
  sleepLower: 'Sleep rating is lower than near the start.',
  sleepSame: 'Sleep rating is similar to the start.',
  irritabilityLower: 'Irritability is lower than on your earliest check-in.',
  irritabilityHigher: 'Irritability is higher than on your earliest check-in.',
  irritabilitySame: 'Irritability is similar to your earliest check-in.',
  anxietyLower: 'Anxiety is lower than on your earliest check-in.',
  anxietyHigher: 'Anxiety is higher than on your earliest check-in.',
  anxietySame: 'Anxiety is similar to your earliest check-in.',
  appetiteHigher: 'Appetite rating has increased since the earliest check-in.',
  appetiteLower: 'Appetite rating is lower than on your earliest check-in.',
  appetiteSame: 'Appetite rating is similar to the start.',
} as const;

export const SYMPTOM_COMPARE_FIELDS: readonly SymptomKind[] = [
  'craving',
  'sleep',
  'irritability',
  'anxiety',
  'appetite',
];

/** Fields where a higher 0–10 rating is typically the more comfortable direction. */
export const HIGHER_IS_MORE_COMFORTABLE: ReadonlySet<SymptomKind> = new Set(['sleep', 'appetite']);

// --- Window selection (deterministic; product heuristic for "primary") -----

const PRIMARY_BY_DAY: ReadonlyArray<{ readonly until: number; readonly id: Exclude<WithdrawalWindowId, 'preparation'> }> = [
  { until: 1, id: 'days_1_3' },
  { until: 6, id: 'days_2_6' },
  { until: 14, id: 'days_7_14' },
  { until: 20, id: 'days_14_21' },
  { until: 28, id: 'days_21_28' },
];

export function windowById(id: WithdrawalWindowId): WithdrawalWindowContent {
  const found = WITHDRAWAL_WINDOWS_V1.find((window) => window.id === id);
  if (found === undefined) {
    throw new RangeError(`unknown withdrawal window: ${id}`);
  }
  return found;
}

export function dayInWindow(breakDay: number, window: WithdrawalWindowContent): boolean {
  if (window.id === 'preparation') return false;
  if (window.dayStart === null) return false;
  if (breakDay < window.dayStart) return false;
  if (window.dayEnd === null) return true;
  return breakDay <= window.dayEnd;
}

/** Every scientific window that contains this abstinence day, including overlaps. */
export function windowsContainingDay(breakDay: number): readonly WithdrawalWindowContent[] {
  if (!Number.isInteger(breakDay) || breakDay < 1) return [];
  return WITHDRAWAL_WINDOWS_V1.filter((window) => dayInWindow(breakDay, window));
}

/**
 * Single "current stage" for Today. Overlaps remain visible on the roadmap.
 * This choice is a product heuristic, not a claim that the windows are exclusive.
 */
export function primaryWindowIdForDay(breakDay: number): WithdrawalWindowId {
  if (!Number.isInteger(breakDay) || breakDay < 1) return 'preparation';
  for (const row of PRIMARY_BY_DAY) {
    if (breakDay <= row.until) return row.id;
  }
  return 'beyond_28';
}

export function primaryWindowForDay(breakDay: number): WithdrawalWindowContent {
  return windowById(primaryWindowIdForDay(breakDay));
}

export function milestonesForDay(breakDay: number): readonly MilestoneContent[] {
  if (!Number.isInteger(breakDay) || breakDay < 1) return [];
  return MILESTONES_V1.filter((milestone) => breakDay >= milestone.day && breakDay <= milestone.throughDay);
}

export function detoxMethodById(id: string): DetoxMethodContent | null {
  return DETOX_METHODS_V1.find((method) => method.id === id) ?? null;
}
