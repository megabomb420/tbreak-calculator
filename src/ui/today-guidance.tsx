import type { TodayGuidanceView } from '../application/presentation/break-guidance.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';
import { CheckinComparisonBlock } from './checkin-comparison.tsx';
import type { SupportArea } from '../application/questionnaire/companion.ts';
import { supportAreasView } from './companion-copy.ts';

export function TodayGuidance({
  view,
  compact = false,
  supportAreas = [],
}: {
  readonly view: TodayGuidanceView;
  readonly compact?: boolean;
  readonly supportAreas?: readonly SupportArea[];
}) {
  const notice = compact ? view.mayNotice.slice(0, 3) : view.mayNotice;
  const help = compact ? view.canHelp.slice(0, 3) : view.canHelp;
  const personalised = supportAreas.length > 0;
  const focus = supportAreasView(supportAreas).primary;
  const primaryAction = personalised
    ? focus.todayAction
    : view.whyThisMatters ?? view.canHelp[0] ?? view.context;
  // On Today the concrete help list stands on its own: do not repeat the line
  // that is already the primary action.
  const compactHelp = compact ? help.filter((line) => line !== primaryAction) : help;
  return (
    <section className="today-guidance" data-testid="today-guidance" data-window={view.windowId}>
      <p className="guidance-headline" data-testid="guidance-headline">
        {view.headline}
      </p>
      {view.milestone !== null ? (
        <p className="guidance-milestone" data-testid="guidance-milestone">
          <span className="guidance-milestone-title">{view.milestone.title}.</span> {view.milestone.body}
        </p>
      ) : null}
      {compact ? (
        <div className="guidance-block guidance-primary">
          <h3 className="guidance-kicker">What matters today</h3>
          <p className="body" data-testid="guidance-primary-action">{primaryAction}</p>
        </div>
      ) : null}
      {compactHelp.length > 0 && compact ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.canHelp}</h3>
          <ul className="guidance-list" data-testid="guidance-help">
            {compactHelp.slice(0, 3).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {notice.length > 0 && !compact ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.mayNotice}</h3>
          <ul className="guidance-list" data-testid="guidance-notice">
            {notice.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {help.length > 0 && !compact ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.canHelp}</h3>
          <ul className="guidance-list" data-testid="guidance-help">
            {help.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {view.intentions.length > 0 && !compact ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.intentions}</h3>
          <ul className="guidance-list intention-list" data-testid="guidance-intentions">
            {view.intentions.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {!compact ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.context}</h3>
          <p className="body" data-testid="phase-focus">{view.context}</p>
        </div>
      ) : (
        <span className="sr-only" data-testid="guidance-context">{view.context}</span>
      )}
      {view.comesNext !== null ? (
        <div className="guidance-block">
          <h3 className="guidance-kicker">{GUIDANCE_CHROME.comesNext}</h3>
          <p className="body" data-testid="guidance-next">
            {view.comesNext}
          </p>
        </div>
      ) : null}
      {view.whyThisMatters !== null && !compact ? (
        <details className="guidance-why" data-testid="guidance-why">
          <summary>{GUIDANCE_CHROME.why}</summary>
          <p className="body">{view.whyThisMatters}</p>
        </details>
      ) : null}
      {view.comparison !== null && view.comparison.available ? (
        <CheckinComparisonBlock view={view.comparison} />
      ) : null}
    </section>
  );
}
