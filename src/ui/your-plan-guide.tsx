import type { SupportArea } from '../application/questionnaire/companion.ts';
import { effectiveSupportAreas, supportAreaCopy } from './companion-copy.ts';

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
  const areas = supportAreas.length === 0 ? effectiveSupportAreas(supportAreas) : supportAreas;
  const primary = supportAreaCopy(areas[0]!);
  const hasPersonalisation = supportAreas.length > 0;
  return (
    <>
      <section className="plan-priority" data-testid="plan-priority">
        <div>
          <p className="micro-label">{hasPersonalisation ? 'Your support areas' : 'Start here'}</p>
          <h3 className="plan-priority-title">{primary.planLead}</h3>
          {hasPersonalisation ? (
            <ul className="support-area-summary" data-testid="support-area-summary">
              {supportAreas.map((area) => <li key={area}>{supportAreaCopy(area).shortLabel}</li>)}
            </ul>
          ) : <p className="body">{primary.todayAction}</p>}
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
            <h3 id="plan-essentials-title" className="card-title">What to do, not just when to finish</h3>
          </div>
        </div>
        <div className="plan-essential-grid">
          <details className="result-disclosure" open>
            <summary>Prepare for the hard moment</summary>
            {areas.map((area) => <p className="body" key={area}>{supportAreaCopy(area).preparation}</p>)}
            <p className="meta">Days 2–6 are commonly among the harder days. That is a planning cue, not a prediction of how you will feel.</p>
          </details>
          <details className="result-disclosure">
            <summary>Know what to watch</summary>
            <p className="body">Watch for changes in craving, sleep, mood, appetite, and automatic routines. You may notice none, some, or several.</p>
            <p className="meta">Feeling better is useful information, but it is not proof that tolerance has fully reset.</p>
          </details>
          <details className="result-disclosure">
            <summary>{`At Day ${targetDays}`}</summary>
            <p className="body">Reassess the goal you started with, mark the break complete if you are ready, and decide how you want THC to fit into life afterwards.</p>
            <p className="meta">If you return, tolerance may be lower and your previous amount is not a safe restart amount. The app does not prescribe a dose.</p>
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
