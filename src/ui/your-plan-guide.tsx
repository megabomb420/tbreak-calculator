import type { SupportArea } from '../application/questionnaire/companion.ts';
import { supportAreasView } from './companion-copy.ts';

export function YourPlanGuide({
  drivers,
  contextNote,
  supportAreas,
  onEditSupport,
}: {
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
