// Static, reviewed research-context copy for the result screen.
//
// This section answers "what does the research say, and what is uncertain".
// It deliberately contains no predicted recovery window, no percentage and no
// personal endpoint: the app does not estimate when an individual's tolerance
// is fully reset. The four-week figure is the human CB1 PET reference, shown
// as a reference and not as a finish line.

export const RESEARCH = {
  title: 'What the research can and cannot say',
  referenceNote:
    'It is a population reference, not a personal finish line, and it does not tell you how strong THC will feel if you use again.',
  notTitle: 'What this does not mean',
  notPoints: [
    'Reaching your planning target does not prove your tolerance has fully reset.',
    'CB1 receptor availability is not the same as subjective tolerance.',
    'Withdrawal easing, tolerance, impairment and drug-test detectability are four separate questions.',
    'Animal findings do not establish a human timetable.',
  ],
  studies: [
    { label: 'Hirvonen et al. · human PET study', href: 'https://pubmed.ncbi.nlm.nih.gov/21747398/' },
    { label: 'D’Souza et al. · CB1 during abstinence', href: 'https://pubmed.ncbi.nlm.nih.gov/29560896/' },
    { label: 'Budney et al. · withdrawal time course', href: 'https://pubmed.ncbi.nlm.nih.gov/12943018/' },
  ],
  /** Shown only for a saved result that carried the discontinued outlook. */
  legacyOutlookNote:
    'This saved result was calculated when the app also showed an estimated recovery window. That estimate was a product heuristic rather than a validated human timeline, so it is no longer part of the result. The planning target and range below are exactly as stored.',
} as const;
