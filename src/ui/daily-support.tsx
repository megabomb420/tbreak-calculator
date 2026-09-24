import { useState } from 'preact/hooks';
import {
  adviceSectionFor,
  SUPPORT_GUIDES,
  SUPPORT_SOURCES,
  type DailySupportView,
} from '../application/presentation/daily-support.ts';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { SUPPORT_AREA_COPY, SUPPORT_AREA_GROUPS } from './companion-copy.ts';
import { ADVICE_PICKER } from './break-copy.ts';

/** One useful action by default; every guide remains available without a
 * sideways hunt or recording a symptom. A new break day resets the choice. */
export function DailySupport({ view }: { readonly view: DailySupportView }) {
  return <DailyAdvice key={view.day} view={view} />;
}

function DailyAdvice({ view }: { readonly view: DailySupportView }) {
  const [picked, setPicked] = useState<SupportArea | null>(null);
  const shown = picked ?? view.defaultArea;
  const section = adviceSectionFor(view, shown);
  const usePractice = picked === null && section.recordedAt === null && !section.usesPersonalPlan;
  const guide = SUPPORT_GUIDES[shown];
  const action = usePractice ? view.practice.action : section.action;
  return (
    <section className="daily-support" data-testid="daily-support" data-window={view.window.id} aria-label="Practical help today">
      {view.allComfortable ? <p className="daily-comfortable" data-testid="comfortable-checkin">Things look fairly settled in your check-in. A break can be uneventful, too.</p> : null}
      <label className="advice-picker-label">
        <span className="micro-label" data-testid="advice-picker-title">{ADVICE_PICKER.title}</span>
        <select data-testid="advice-picker" value={picked ?? ''} onInput={(event) => setPicked(event.currentTarget.value === '' ? null : event.currentTarget.value as SupportArea)}>
          <option value="">Today's suggestion</option>
          {SUPPORT_AREA_GROUPS.map(group => <optgroup key={group.label} label={group.label}>
            {group.areas.map(area => <option key={area} value={area}>{SUPPORT_AREA_COPY[area].shortLabel}</option>)}
          </optgroup>)}
        </select>
      </label>
      <article className="support-card" data-testid="advice-block" data-area={shown}>
        <h3 className="card-title" data-testid="advice-title">{usePractice ? view.practice.title : guide.title}</h3>
        {section.recordedAt !== null ? <p className="meta advice-reason" data-testid="advice-reason">
          {section.reason} · <time dateTime={section.recordedAt}>{new Date(section.recordedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time>
        </p> : null}
        <p className="body advice-first-step" data-testid="advice-action">{action}</p>
        {section.triggerLine !== null ? <p className="meta" data-testid="advice-trigger">{section.triggerLine}</p> : null}
        {section.fallbackLine !== null ? <p className="meta" data-testid="advice-fallback">{section.fallbackLine}</p> : null}
        <details key={shown} className="advice-details" data-testid="advice-guide">
          <summary>{ADVICE_PICKER.more}</summary>
          <div className="advice-content">
            <p className="body">{guide.explanation}</p>
            <ul className="advice-steps">{guide.steps.filter(step => step !== action).map(step => <li key={step}>{step}</li>)}</ul>
            <p className="meta">{guide.avoid}</p>
            {guide.seekHelp ? <p className="advice-help"><strong>When to get advice</strong> {guide.seekHelp}</p> : null}
            <div className="advice-sources">{guide.sources.map(id => <a key={id} className="text-link source-link" href={SUPPORT_SOURCES[id].href} target="_blank" rel="noopener noreferrer">{SUPPORT_SOURCES[id].label} ↗</a>)}</div>
          </div>
        </details>
      </article>
    </section>
  );
}
