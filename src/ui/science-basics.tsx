import { useRef } from 'preact/hooks';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { COMMUNITY_TIPS, SUPPORT_SOURCES } from '../application/presentation/daily-support.ts';
import { ADVICE_PICKER, GUIDANCE_CHROME } from './break-copy.ts';

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
    title: 'What the app will not estimate',
    body: 'The app does not calculate a personal recovery date, window or percentage. Your plan is a planning target inside a broad research-informed range: a point to review your goal, not proof that tolerance has fully reset. Extra abstinence can still serve habit change, continued abstinence or personal aims, but it does not earn a continuing reset score.',
    note: 'Reaching your target, feeling better, and a drug test result are three different questions. The app keeps them apart.',
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
    note: 'This is a planning tool, not medical advice. Your check-ins record the days you report; they do not diagnose symptoms.',
  },
];

export function ScienceBasicsPanel({ onClose }: { readonly onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  return (
    <div className="questionnaire-overlay" data-testid="science-basics" role="dialog"
      aria-modal="true" aria-labelledby="science-basics-title" ref={rootRef}>
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={GUIDANCE_CHROME.closeReference} onClick={onClose}><CloseIcon /></button>
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
        <section className="reading-section">
          <h3 className="card-title">Practical advice during a break</h3>
          <p className="body">Today combines recorded withdrawal guidance for the stage you are in with general self-care and practical activities. It suggests one practical action for the day — the day’s own activity, or your saved urge plan where it covers the topic — and all eleven topic guides are available under “{ADVICE_PICKER.title}”; choosing a topic stores nothing and no rating is collected. A rating saved by a check-in in an earlier release still names the topic it raised and stays listed in your history, while the check-in here records the day only. Advice never changes the tolerance calculation, and the daily activity schedule and advice order are editorial choices, not clinically validated predictions.</p>
          <p className="meta">University of Vermont is used for practical habit ideas, not to establish a reset duration or explain THC clearance.</p>
          {Object.values(SUPPORT_SOURCES).map(source => <a className="text-link source-link" key={source.href} href={source.href} target="_blank" rel="noopener noreferrer">{source.kind} · {source.label} ↗</a>)}
        </section>
        <section className="reading-section">
          <h3 className="card-title">Experiences from Reddit</h3>
          <p className="body">These are selected, paraphrased experiences from individual commenters in r/Petioles, checked on 20 and 24 September 2026. Today matches them to the topic you are dealing with and to the broad stage of the break; the reported days are still personal experiences, not a recovery schedule.</p>
          <p className="meta">Only the described idea is included. Other advice in the linked discussion has not been endorsed. The app does not load Reddit or send your data there; links open externally.</p>
          {COMMUNITY_TIPS.filter((tip, index, all) => all.findIndex(item => item.href === tip.href) === index)
            .map(tip => <a className="text-link source-link" href={tip.href} key={tip.href} target="_blank" rel="noopener noreferrer">r/Petioles · {tip.thread} ↗</a>)}
        </section>
      </div>
    </div>
  );
}
