import type { SupportArea } from '../application/questionnaire/companion.ts';
import { supportAreasView } from './companion-copy.ts';

export function YourPlanGuide({
  targetDays,
  drivers,
  contextNote,
  supportAreas,
  onEditSupport,
}: {
  readonly targetDays: number;
  readonly drivers: readonly string[];
  readonly contextNote: string | null;
  readonly supportAreas: readonly SupportArea[];
  readonly onEditSupport?: () => void;
}) {
  const view = supportAreasView(supportAreas);
  const hasPersonalisation = view.areas.length > 0;
  return (
    <>
      <section className="plan-priority" data-testid="plan-priority">
        <div>
          <p className="micro-label">{hasPersonalisation ? 'Your support areas' : 'Start here'}</p>
          <h3 className="plan-priority-title">{view.primary.planLead}</h3>
          {hasPersonalisation ? (
            <ul className="support-area-summary" data-testid="support-area-summary">
              {view.areas.map((area) => <li key={area}>{supportAreasView([area]).primary.shortLabel}</li>)}
            </ul>
          ) : <p className="body">{view.primary.todayAction}</p>}
        </div>
        {onEditSupport ? (
          <button type="button" className="text-link" data-testid="edit-support" onClick={onEditSupport}>
            {hasPersonalisation ? 'Edit support' : 'Personalise your plan'}
          </button>
        ) : null}
      </section>

      <section className="plan-essentials" aria-labelledby="plan-essentials-title">
        <div className="section-heading-row">
          <div>
            <p className="micro-label">Plan essentials</p>
            <h3 id="plan-essentials-title" className="card-title">Before, during, and after the break</h3>
          </div>
        </div>
        <div className="plan-essential-grid">
          <details className="result-disclosure" open>
            <summary>Before the break</summary>
            {view.areas.length > 0 ? (
              view.areas.map((area) => (
                <p className="body" key={area}>{supportAreasView([area]).primary.preparation}</p>
              ))
            ) : (
              <p className="body">{view.primary.preparation}</p>
            )}
            <p className="meta">Days 2–6 are commonly among the harder days. That is a planning cue, not a prediction of how you will feel.</p>
          </details>
          <details className="result-disclosure">
            <summary>During the break</summary>
            <p className="body">Watch for changes in sleep, mood, cravings, appetite, stomach comfort, and headaches. You may notice none, some, or several.</p>
            <p className="meta">Feeling better is useful information, but it is not proof that tolerance has fully reset.</p>
          </details>
          <details className="result-disclosure">
            <summary>{`At Day ${targetDays}`}</summary>
            <p className="body">Review your original goal. Then complete or extend the break and confirm your post-break plan.</p>
            <p className="meta">If you return, tolerance may be lower. Do not treat your previous amount as a restart amount; the app does not prescribe a dose.</p>
          </details>
        </div>
      </section>

      <details className="result-disclosure why-plan" data-testid="why-plan">
        <summary>Why this plan</summary>
        <ul className="driver-list">
          {drivers.map((line) => (
            <li key={line} className="driver-item">
              <span className="driver-mark" aria-hidden="true" />
              <span>{line}</span>
            </li>
          ))}
        </ul>
        {contextNote ? <p className="meta" data-testid="planning-context">{contextNote}</p> : null}
      </details>
    </>
  );
}
