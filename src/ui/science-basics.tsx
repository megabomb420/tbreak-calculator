import { useRef } from 'preact/hooks';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

interface ScienceSection {
  readonly title: string;
  readonly body: readonly string[];
}

const SCIENCE_SECTIONS: readonly ScienceSection[] = [
  {
    title: 'A range, not an exact day',
    body: [
      'The calculator turns research findings into a broad planning range: 2–7, 7–14, 14–21 or 21–28 days, depending on how often and how intensely you use.',
      'Your plan target sits inside that range as a planning choice — the lower end for a recently established pattern, the upper end for a long-established one. The range itself never extends past 28 days.',
    ],
  },
  {
    title: 'The four-week human reference',
    body: [
      'Two small PET studies give the strongest biological anchor. In chronic, heavy cannabis users, CB1 receptor availability was lower than in controls at baseline, and after around four weeks of monitored abstinence it was back to control levels.',
      'That does not prove “28 days = a full reset” for any individual. Imaging measures receptor availability, not how strongly your next use will feel, so the app never states an exact or guaranteed reset day.',
    ],
  },
  {
    title: 'Withdrawal is its own timeline',
    body: [
      'Withdrawal symptoms usually begin within the first days, most commonly peak around days 2–6, and largely ease across the first couple of weeks. Sleep-related symptoms can take longer in heavier users.',
      'A craving spike during the peak window is statistically common — it is a sign the break is working as expected, not that it is failing.',
    ],
  },
  {
    title: 'Detectability is a different question',
    body: [
      'Tolerance, intoxication and what a drug test detects are separate things. Metabolites can remain detectable long after effects and CB1 recovery.',
      'That is why detection lives in its own qualitative module: the app explains the basics for each test type, but it never predicts a guaranteed “clean date”.',
    ],
  },
  {
    title: 'Detox and flush claims are not supported',
    body: [
      'Saunas, extra water, cranberry juice, vitamins, fasting or intense exercise have no credible evidence that they meaningfully speed up the removal of stored THC.',
      'Feeling better is not proof of faster elimination, and the app treats wellbeing and detox claims as separate things.',
    ],
  },
  {
    title: 'Everything is deterministic and on-device',
    body: [
      'No runtime AI writes your explanation. Every range, plan, outlook and insight is computed locally from fixed rules over your own data.',
      'The app is a planning companion, not medical advice.',
    ],
  },
];

export function ScienceBasicsPanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  return (
    <div
      className="questionnaire-overlay"
      data-testid="science-basics"
      role="dialog"
      aria-modal="true"
      aria-labelledby="science-basics-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.closeReference} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="science-basics-title" className="flow-title">
          {GUIDANCE_CHROME.openScience}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <p className="body">{GUIDANCE_CHROME.scienceLead}</p>
        {SCIENCE_SECTIONS.map((section) => (
          <section className="card" key={section.title}>
            <h3 className="card-title">{section.title}</h3>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="body">
                {paragraph}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}
