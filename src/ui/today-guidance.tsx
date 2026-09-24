import { CheckinComparisonBlock } from './checkin-comparison.tsx';
import { compareCheckins } from '../application/presentation/checkin-comparison.ts';
import type { DailySupportView } from '../application/presentation/daily-support.ts';

/**
 * The stage the day sits in: what the window is and one sentence of what it
 * means, and nothing more. The symptom list belongs to the leg the person is
 * living through ("You are here" → What to expect), so no section repeats it;
 * the day's action belongs to the advice card above.
 */
export function StageBlock({ support }: { readonly support: DailySupportView }) {
  return (
    <section className="today-block" data-testid="today-stage">
      <h3 className="section-heading">This stage</h3>
      <p className="stage-label" data-testid="stage-window-label">{support.window.label}</p>
      <p className="stage-headline" data-testid="guidance-headline">{support.window.headline}</p>
      <p className="body" data-testid="guidance-context">{support.window.context}</p>
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
