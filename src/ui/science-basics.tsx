import { useRef } from 'preact/hooks';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

const SECTIONS = [
  {
    title: 'A useful plan, with limits',
    body: 'The 2–7, 7–14, 14–21 and 21–28 day ranges are planning rules informed by research. They are not durations proven for each use pattern in a clinical trial. Your answers select a range and a target within it.',
  },
  {
    title: 'What the four-week reference means',
    body: 'Small human imaging studies found that CB1 receptor availability changed during abstinence. In many brain regions it moved toward control levels, or group differences were no longer statistically evident, by around four weeks. The studies mainly involved men with chronic or dependent use.',
    note: 'Receptor availability is not a measure of how strongly THC will feel. These findings do not establish a personal full-reset date.',
    links: [
      { label: 'Hirvonen et al. — human PET study', href: 'https://pubmed.ncbi.nlm.nih.gov/21747398/' },
      { label: 'D’Souza et al. — changes during abstinence', href: 'https://pubmed.ncbi.nlm.nih.gov/29560896/' },
    ],
  },
  {
    title: 'How to read the recovery outlook',
    body: 'The recovery outlook is a separate app estimate. It uses broad rules about your pattern; it does not measure your biology. Some estimates extend past four weeks, but direct human tolerance studies have not validated those extra days. Animal findings cannot establish a human recovery timetable.',
    note: 'Treat your plan target as a point to review your goal, not proof of complete recovery.',
  },
  {
    title: 'Withdrawal follows a different timeline',
    body: 'Withdrawal often starts in the first 1–3 days and peaks around days 2–6. Many acute symptoms ease across the first two weeks; sleep problems can last longer. These windows overlap, and individual experiences vary.',
    note: 'Feeling better, or having a difficult day, does not tell you how much your tolerance has changed.',
    links: [{ label: 'Budney et al. — withdrawal time course', href: 'https://pubmed.ncbi.nlm.nih.gov/12943018/' }],
  },
  {
    title: 'A break cannot predict a test result',
    body: 'Tolerance, impairment and detectability are different questions. Test results depend on the sample, method, cutoff and use history. This app explains urine, blood, saliva and hair tests without promising a negative-test date.',
  },
  {
    title: 'Wellbeing is different from “detox”',
    body: 'The research brief does not support extra water, sauna, fasting, niacin or detox drinks as reliable ways to speed THC elimination. Normal hydration, meals and routine are practical support during a break; they do not earn a shorter countdown.',
  },
  {
    title: 'Your data stays here',
    body: 'Calculations and guidance work on your device. No account is needed, and your answers are not sent to an AI service. Research links open external websites and require a connection.',
    note: 'This is a planning tool, not medical advice. Your check-ins record your experience; they do not diagnose symptoms.',
  },
];

export function ScienceBasicsPanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  return (
    <div className="questionnaire-overlay" data-testid="science-basics" role="dialog"
      aria-modal="true" aria-labelledby="science-basics-title" ref={rootRef}>
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label="Close reference" onClick={onClose}><CloseIcon /></button>
        <h2 id="science-basics-title" className="flow-title">The science behind your plan</h2>
      </header>
      <div className="questionnaire-body flow-body science-body">
        <p className="body science-intro">Research gives us useful reference points. It cannot give you an exact reset date.</p>
        {SECTIONS.map((section) => <section className="reading-section" key={section.title}>
          <h3 className="card-title">{section.title}</h3>
          <p className="body">{section.body}</p>
          {section.note ? <p className="meta">{section.note}</p> : null}
          {section.links?.map((link) => <a className="text-link source-link" href={link.href} key={link.href}
            target="_blank" rel="noopener noreferrer">{link.label} ↗</a>)}
        </section>)}
      </div>
    </div>
  );
}
