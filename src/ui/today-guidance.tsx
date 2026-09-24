import { CheckinComparisonBlock } from './checkin-comparison.tsx';
import { compareCheckins } from '../application/presentation/checkin-comparison.ts';
import type { DailySupportView } from '../application/presentation/daily-support.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';

/**
 * The stage the day sits in: what the window is, what people commonly notice,
 * and the day's own practical activity. Always open — this is the context the
 * day's action comes from, not a detail to dig for.
 */
export function StageBlock({ support }: { readonly support: DailySupportView }) {
  return (
    <section className="today-block" data-testid="today-stage">
      <h3 className="section-heading">This stage</h3>
      <p className="stage-label" data-testid="stage-window-label">{support.window.label}</p>
      <p className="stage-headline" data-testid="guidance-headline">{support.window.headline}</p>
      <p className="body" data-testid="guidance-context">{support.window.context}</p>
      {support.window.mayNotice.length > 0 ? (
        <details className="advice-details" data-testid="stage-may-notice">
          <summary>{GUIDANCE_CHROME.mayNotice}</summary>
          <ul className="guidance-list" data-testid="guidance-may-notice">
            {support.window.mayNotice.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </details>
      ) : null}
    </section>
  );
}

/** What the person's own recorded check-ins changed. Present only when the
 * stored data can say something, and never a score. */
export function ExtraBlocks({ support }: { readonly support: DailySupportView }) {
  const comparison = compareCheckins(support.currentCheckins, { breakDay: support.day });
  return comparison.available ? (
    <section className="today-block" data-testid="today-comparison">
      <h3 className="section-heading">Your recorded changes</h3>
      <CheckinComparisonBlock view={comparison} />
    </section>
  ) : null;
}
