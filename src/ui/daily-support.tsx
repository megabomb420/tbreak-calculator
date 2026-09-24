import { useState } from 'preact/hooks';
import { SUPPORT_GUIDES, SUPPORT_SOURCES, type DailySupportView } from '../application/presentation/daily-support.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS } from './companion-copy.ts';

/**
 * One card, not a stack of essays: the topic Today leads with, the sentence to
 * act on, and the person's own plan when it exists. Everything else — the full
 * guide, the other rated topics, every area — opens from this card.
 */
export function DailySupport({ view }: { readonly view: DailySupportView }) {
  // Local choice only: opening another topic never writes storage.
  const [picked, setPicked] = useState<SupportArea | null>(null);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const area = picked ?? view.primaryArea;
  const primary = area === view.primaryArea;
  const guide = SUPPORT_GUIDES[area];
  const selection = view.selections[0];
  const also = view.selections.slice(1);
  return (
    <section className="daily-support" data-testid="daily-support" data-window={view.window.id} aria-label="Advice for today">
      {view.allComfortable ? (
        <p className="daily-comfortable" data-testid="comfortable-checkin">
          Things look fairly settled in your check-in. A break can be uneventful, too.
        </p>
      ) : null}
      <article className="support-card" data-testid="support-card" data-area={area}>
        <h3 className="card-title">{guide.title}</h3>
        <p className="meta advice-reason" data-testid="support-reason">
          {primary ? view.primaryReason : 'Opened from the list'}
          {primary && selection?.recordedAt != null ? (
            <> · <time dateTime={selection.recordedAt}>{new Date(selection.recordedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></>
          ) : null}
        </p>
        <p className="meta" data-testid="advice-basis">{view.status}</p>
        <p className="body advice-first-step" data-testid="support-action">
          {primary ? view.action : guide.steps[0]}
        </p>
        {primary && view.triggerLine !== null ? (
          <p className="meta" data-testid="support-trigger">{view.triggerLine}</p>
        ) : null}
        {primary && view.fallbackLine !== null ? (
          <p className="meta" data-testid="support-fallback">{view.fallbackLine}</p>
        ) : null}
        <details className="advice-details">
          <summary>More</summary>
          <GuideContent area={area} skipFirst />
        </details>
        {also.length > 0 ? (
          <div className="support-also" data-testid="support-also">
            <p className="micro-label">Also rated</p>
            <div className="advice-topics">
              {also.map((item) => (
                <button
                  type="button"
                  key={item.area}
                  className={area === item.area ? 'advice-topic selected' : 'advice-topic'}
                  onClick={() => setPicked(item.area)}
                >
                  {SUPPORT_AREA_COPY[item.area].shortLabel}
                </button>
              ))}
            </div>
          </div>
        ) : null}
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
                      aria-pressed={area === groupArea}
                      className={area === groupArea ? 'advice-topic selected' : 'advice-topic'}
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
      </article>
    </section>
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
