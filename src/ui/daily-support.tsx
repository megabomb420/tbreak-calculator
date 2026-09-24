import { useState } from 'preact/hooks';
import { SUPPORT_GUIDES, SUPPORT_SOURCES, type AdviceSection, type DailySupportView } from '../application/presentation/daily-support.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS } from './companion-copy.ts';

/**
 * Every topic the day's ratings raised, expanded one under another: the hardest
 * reading first, then the rest. Tapping a topic never swaps a single card, so
 * nothing already read disappears.
 */
export function DailySupport({ view }: { readonly view: DailySupportView }) {
  const [picked, setPicked] = useState<SupportArea | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const sections: readonly AdviceSection[] = picked === null || view.sections.some((item) => item.area === picked)
    ? view.sections
    : [...view.sections, { area: picked, reason: 'Opened from the list', recordedAt: null, action: SUPPORT_GUIDES[picked].steps[0], triggerLine: null, fallbackLine: null }];
  return (
    <section className="daily-support" data-testid="daily-support" data-window={view.window.id} aria-label="Advice for today">
      <p className="meta advice-basis" data-testid="advice-basis">{view.status}</p>
      {view.allComfortable ? (
        <p className="daily-comfortable" data-testid="comfortable-checkin">
          Things look fairly settled in your check-in. A break can be uneventful, too.
        </p>
      ) : null}
      {sections.map((section) => <AdviceBlock key={section.area} section={section} />)}
      <button
        type="button"
        className="text-back"
        data-testid="support-switch"
        aria-expanded={topicsOpen}
        onClick={() => setTopicsOpen((open) => !open)}
      >
        Not this?
      </button>
      {topicsOpen ? (
        <div className="advice-topic-groups" data-testid="support-topics">
          <p className="meta" data-testid="support-topics-note">
            Your recent check-ins pick this topic, with the hardest rating first. A rating stops counting after 48 hours.
            Unrecorded symptoms stay unknown. The order is an app choice, not a diagnosis or a recovery score.
          </p>
          {SUPPORT_AREA_GROUPS.map((group) => (
            <div key={group.id}>
              <p className="micro-label">{group.label}</p>
              <div className="advice-topics">
                {group.areas.map((groupArea) => (
                  <button
                    type="button"
                    key={groupArea}
                    aria-pressed={sections.some((item) => item.area === groupArea)}
                    className="advice-topic"
                    onClick={() => setPicked(groupArea)}
                  >
                    {SUPPORT_AREA_COPY[groupArea].shortLabel}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AdviceBlock({ section }: { readonly section: AdviceSection }) {
  const guide = SUPPORT_GUIDES[section.area];
  return (
    <article className="support-card" data-testid={`advice-${section.area}`} data-area={section.area}>
      <h3 className="card-title">{guide.title}</h3>
      <p className="meta advice-reason" data-testid={`advice-${section.area}-reason`}>
        {section.reason}
        {section.recordedAt !== null ? (
          <> · <time dateTime={section.recordedAt}>{new Date(section.recordedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></>
        ) : null}
      </p>
      <p className="body advice-first-step" data-testid={`advice-${section.area}-action`}>{section.action}</p>
      {section.triggerLine !== null ? (
        <p className="meta" data-testid={`advice-${section.area}-trigger`}>{section.triggerLine}</p>
      ) : null}
      {section.fallbackLine !== null ? (
        <p className="meta" data-testid={`advice-${section.area}-fallback`}>{section.fallbackLine}</p>
      ) : null}
      <GuideContent area={section.area} skipFirst />
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
