import { CommunityCarousel } from './community-carousel.tsx';
import { CheckinComparisonBlock } from './checkin-comparison.tsx';
import { compareCheckins } from '../application/presentation/checkin-comparison.ts';
import type { DailySupportView } from '../application/presentation/daily-support.ts';

/** A glanceable stage headline; longer context stays one tap away. */
export function StageBlock({ support }: { readonly support: DailySupportView }) {
  return (
    <details className="result-disclosure today-block" data-testid="today-stage">
      <summary><span><span className="micro-label">{support.window.label} · What to expect</span><span className="stage-headline" data-testid="guidance-headline">{support.window.headline}</span></span></summary>
      <p className="body" data-testid="guidance-context">{support.window.context}</p>
      <ul className="guidance-list" data-testid="guidance-may-notice">
        {support.window.mayNotice.map((line) => <li key={line}>{line}</li>)}
      </ul>
    </details>
  );
}

/** Optional experiences and preserved legacy check-in comparisons. */
export function ExtraBlocks({ support }: { readonly support: DailySupportView }) {
  const comparison = compareCheckins(support.currentCheckins, { breakDay: support.day });
  return (
    <>
      <details className="result-disclosure today-block" data-testid="today-experiences">
        <summary>Experiences</summary>
        <CommunityCarousel key={support.day} tips={support.communityTips} initialId={support.communityTip.id} />
      </details>
      {comparison.available ? (
        <section className="result-disclosure today-block" data-testid="today-comparison">
          <h3 className="card-title">Your recorded changes</h3>
          <CheckinComparisonBlock view={comparison} />
        </section>
      ) : null}
    </>
  );
}
