import { useState } from 'preact/hooks';
import {
  adviceSectionFor,
  SUPPORT_GUIDES,
  SUPPORT_SOURCES,
  type AdviceSection,
  type DailySupportView,
} from '../application/presentation/daily-support.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS } from './companion-copy.ts';
import { ADVICE_PICKER } from './break-copy.ts';

/**
 * One topic at a time, in this spot: the row picks what to deal with and the
 * block directly beneath it is that topic's advice. Nothing stacks up, and
 * choosing a topic never leaves the reader with the previous guide gone from
 * the page but unread.
 */
/** Every topic in one scrollable row: the picker must not push the day's
 * action below the fold. */
const TOPIC_ORDER: readonly SupportArea[] = SUPPORT_AREA_GROUPS.flatMap((group) => group.areas);

export function DailySupport({ view }: { readonly view: DailySupportView }) {
  const [picked, setPicked] = useState<SupportArea | null>(null);
  const shown = picked ?? view.defaultArea;
  const section: AdviceSection = adviceSectionFor(view, shown);
  return (
    <section className="daily-support" data-testid="daily-support" data-window={view.window.id} aria-label={ADVICE_PICKER.title}>
      {view.allComfortable ? (
        <p className="daily-comfortable" data-testid="comfortable-checkin">
          Things look fairly settled in your check-in. A break can be uneventful, too.
        </p>
      ) : null}
      <h3 className="micro-label" data-testid="advice-picker-title">{ADVICE_PICKER.title}</h3>
      <div className="topic-picker" data-testid="advice-picker" role="group" aria-label={ADVICE_PICKER.title}>
        {TOPIC_ORDER.map((area) => (
          <button
            type="button"
            key={area}
            className={area === shown ? 'advice-topic selected' : 'advice-topic'}
            data-testid={`advice-topic-${area}`}
            aria-pressed={area === shown}
            onClick={() => setPicked(area)}
          >
            {SUPPORT_AREA_COPY[area].shortLabel}
          </button>
        ))}
      </div>
      <AdviceBlock section={section} />
    </section>
  );
}

function AdviceBlock({ section }: { readonly section: AdviceSection }) {
  const guide = SUPPORT_GUIDES[section.area];
  return (
    <article className="support-card" data-testid="advice-block" data-area={section.area}>
      <h4 className="card-title" data-testid="advice-title">{guide.title}</h4>
      <p className="meta advice-reason" data-testid="advice-reason">
        {section.reason}
        {section.recordedAt !== null ? (
          <> · <time dateTime={section.recordedAt}>{new Date(section.recordedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></>
        ) : null}
      </p>
      <p className="body advice-first-step" data-testid="advice-action">{section.action}</p>
      {section.triggerLine !== null ? <p className="meta" data-testid="advice-trigger">{section.triggerLine}</p> : null}
      {section.fallbackLine !== null ? <p className="meta" data-testid="advice-fallback">{section.fallbackLine}</p> : null}
      {/* The action is the point; the reasoning, the remaining steps and the
          sources are here for whoever wants them. */}
      <details className="advice-details" data-testid="advice-guide">
        <summary>{ADVICE_PICKER.more}</summary>
        <GuideContent area={section.area} skipFirst />
      </details>
    </article>
  );
}

function GuideContent({ area, skipFirst = false }: { readonly area: SupportArea; readonly skipFirst?: boolean }) {
  const guide = SUPPORT_GUIDES[area];
  return <div className="advice-content">
    <p className="body">{guide.explanation}</p>
    <ul className="advice-steps">{guide.steps.slice(skipFirst ? 1 : 0).map(step => <li key={step}>{step}</li>)}</ul>
    <p className="meta">{guide.avoid}</p>
    {guide.seekHelp ? <p className="advice-help"><strong>When to get advice</strong> {guide.seekHelp}</p> : null}
    <div className="advice-sources">{guide.sources.map(id => <a key={id} className="text-link source-link"
      href={SUPPORT_SOURCES[id].href} target="_blank" rel="noopener noreferrer">{SUPPORT_SOURCES[id].label} ↗</a>)}</div>
  </div>;
}
