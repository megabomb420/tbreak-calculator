// Curated, static research context for the active-break Today card.
//
// One short, neutral fact per stage of a break, selected by the current
// abstinence day. Facts are population-level evidence context — never
// personal predictions, coaching, or recovery claims. Sources are the same
// PubMed references the app's Science screen already links, so nothing new is
// cited and nothing is fetched at runtime.

export interface BreakResearchFact {
  readonly id: string;
  /** Inclusive abstinence-day range this fact applies to; null = day >= fromDay. */
  readonly fromDay: number;
  readonly toDay: number | null;
  readonly text: string;
  readonly sourceLabel: string;
  readonly sourceUrl: string;
}

const PMC = 'https://pubmed.ncbi.nlm.nih.gov/';
const BUDNEY = `${PMC}12943018/`;
const DSOUZA = `${PMC}29560896/`;
const HIRVONEN = `${PMC}21747398/`;

export const BREAK_RESEARCH_FACTS: readonly BreakResearchFact[] = [
  {
    id: 'withdrawal_onset',
    fromDay: 1,
    toDay: 1,
    text: 'Withdrawal symptoms, when they occur, commonly begin within the first 1–3 days after stopping.',
    sourceLabel: 'Budney et al. — withdrawal time course',
    sourceUrl: BUDNEY,
  },
  {
    id: 'withdrawal_peak',
    fromDay: 2,
    toDay: 6,
    text: 'When cannabis withdrawal occurs, symptoms commonly peak around days 2–6.',
    sourceLabel: 'Budney et al. — withdrawal time course',
    sourceUrl: BUDNEY,
  },
  {
    id: 'acute_ease',
    fromDay: 7,
    toDay: 14,
    text: 'Most acute withdrawal symptoms improve during the first couple of weeks, though the timeline varies between people.',
    sourceLabel: 'Budney et al. — withdrawal time course',
    sourceUrl: BUDNEY,
  },
  {
    id: 'sleep_later',
    fromDay: 15,
    toDay: 20,
    text: 'Sleep disturbance can persist for several weeks, sometimes after other withdrawal symptoms have improved.',
    sourceLabel: 'Budney et al. — withdrawal time course',
    sourceUrl: BUDNEY,
  },
  {
    id: 'cb1_reversal',
    fromDay: 21,
    toDay: 28,
    text: 'Brain CB1 receptor changes associated with frequent cannabis use begin reversing during abstinence and continue to recover over time.',
    sourceLabel: 'D’Souza et al. — changes during abstinence',
    sourceUrl: DSOUZA,
  },
  {
    id: 'four_week_anchor',
    fromDay: 29,
    toDay: null,
    text: 'Around four weeks is a useful research anchor — not a universal point where tolerance is guaranteed to be fully reset.',
    sourceLabel: 'Hirvonen et al. — human PET study',
    sourceUrl: HIRVONEN,
  },
];

/** The research fact for an abstinence day (falls back to the last entry). */
export function researchFactForDay(day: number): BreakResearchFact {
  for (const fact of BREAK_RESEARCH_FACTS) {
    if (day >= fact.fromDay && (fact.toDay === null || day <= fact.toDay)) return fact;
  }
  return BREAK_RESEARCH_FACTS[BREAK_RESEARCH_FACTS.length - 1]!;
}
