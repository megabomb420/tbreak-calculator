import { CommunityCarousel } from './community-carousel.tsx';
import { useId, useState } from 'preact/hooks';
import { presentDailySupport, SUPPORT_GUIDES, SUPPORT_SOURCES, type DailySupportInput } from '../application/presentation/daily-support.ts';
import { compareCheckins } from '../application/presentation/checkin-comparison.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS } from './companion-copy.ts';
import { CheckinComparisonBlock } from './checkin-comparison.tsx';

export function DailySupport({ input }: { readonly input: DailySupportInput }) {
  const view = presentDailySupport(input);
  const guideId = useId();
  const [opened, setOpened] = useState<SupportArea | null>(null);
  const comparison = compareCheckins(view.currentCheckins, { breakDay: input.day });
  return (
    <section className="daily-support" data-testid="today-guidance" data-window={view.window.id} aria-label="Advice for today">
      <details className="daily-context">
        <summary><span className="micro-label">{view.window.label} · What to expect</span></summary>
        <h3 className="card-title" data-testid="guidance-headline">{view.window.headline}</h3>
        <p className="body" data-testid="guidance-context">{view.window.context}</p>
        <p className="meta daily-symptom-context">{view.window.mayNotice.join(' · ')}</p>
      </details>

      <div className="daily-help" data-testid="guidance-help">
        <div className="daily-section-heading">
          <h3 className="card-title">What matters today</h3>
          <p className="meta" data-testid="advice-basis">{view.status}</p>
        </div>
        {view.allComfortable ? <p className="daily-comfortable" data-testid="comfortable-checkin">Things look fairly settled in your check-in. A break can be uneventful, too.</p> : null}
        {view.selections.map((selection, index) => (
          <article className="daily-advice" key={selection.area} data-testid={`advice-${selection.area}`}>
            <div className="daily-advice-heading">
              <span className="daily-advice-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h4>{SUPPORT_GUIDES[selection.area].title}</h4>
                <p className="meta advice-reason">
                  {selection.reason}
                  {selection.recordedAt !== null ? <> · <time dateTime={selection.recordedAt}>{new Date(selection.recordedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></> : null}
                </p>
              </div>
            </div>
            <p className="body advice-first-step" data-testid={index === 0 ? 'guidance-primary-action' : undefined}>{SUPPORT_GUIDES[selection.area].steps[0]}</p>
            <details className="advice-details">
              <summary>More for {SUPPORT_AREA_COPY[selection.area].shortLabel.toLowerCase()}</summary>
              <GuideContent area={selection.area} skipFirst />
            </details>
          </article>
        ))}
        <article className="daily-practice" data-testid="daily-practice">
          <p className="micro-label">One thing to try today</p>
          <h4>{view.practice.title}</h4>
          <p className="body">{view.practice.action}</p>
          {view.plannedAlternative ? <p className="meta">{view.plannedAlternative}</p> : null}
        </article>
      </div>

      <details className="result-disclosure advice-browser" data-testid="advice-browser">
        <summary>Help with something else</summary>
        <p className="meta">Open any topic when you need it. This does not change your saved preferences.</p>
        <div className="advice-topic-groups">
          {SUPPORT_AREA_GROUPS.map(group => <div key={group.id}>
            <p className="micro-label">{group.label}</p>
            <div className="advice-topics">
              {group.areas.map(area => <button type="button" key={area} aria-pressed={opened === area}
                className={opened === area ? 'advice-topic selected' : 'advice-topic'}
                aria-controls={guideId} onClick={() => setOpened(area)}>{SUPPORT_AREA_COPY[area].shortLabel}</button>)}
            </div>
          </div>)}
        </div>
        <div id={guideId} aria-live="polite" aria-atomic="true">
          {opened !== null ? <article className="advice-opened" key={opened} data-testid="opened-advice">
            <h4>{SUPPORT_GUIDES[opened].title}</h4><GuideContent area={opened} />
          </article> : null}
        </div>
      </details>

      <CommunityCarousel key={view.day} tips={view.communityTips} initialId={view.communityTip.id} />

      {comparison.available ? <details className="result-disclosure daily-comparison">
        <summary>Your recorded changes</summary><CheckinComparisonBlock view={comparison} />
      </details> : null}
      <details className="result-disclosure daily-about">
        <summary>How these suggestions are chosen</summary>
        <p className="meta">Recent ratings take priority. Other suggestions rotate through your chosen topics and practical activities for the day. Unrecorded symptoms stay unknown. The order is an app choice, not a diagnosis or a recovery score.</p>
        <p className="meta">Day-by-day activities are a practical schedule, not predictions about what your body should do. Research describes overlapping windows, and symptoms can have other causes.</p>
      </details>
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
