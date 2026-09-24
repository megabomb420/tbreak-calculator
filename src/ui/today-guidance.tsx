import { CommunityCarousel } from './community-carousel.tsx';
import { DailySupport } from './daily-support.tsx';
import { CheckinComparisonBlock } from './checkin-comparison.tsx';
import { compareCheckins } from '../application/presentation/checkin-comparison.ts';
import type { DailySupportView } from '../application/presentation/daily-support.ts';

/**
 * The daily guidance block every Today state shows: one support card, then the
 * stage it belongs to, the experiences for that stage and the recorded
 * differences — each behind a closed disclosure, so the first screen stays one
 * job and the depth is one tap away.
 */
export function DailyGuidance({ support }: { readonly support: DailySupportView }) {
  const comparison = compareCheckins(support.currentCheckins, { breakDay: support.day });
  return (
    <>
      <DailySupport view={support} />
      <details className="result-disclosure" data-testid="today-stage">
        <summary>This stage</summary>
        <p className="micro-label">{support.window.label} · What to expect</p>
        <h3 className="card-title" data-testid="guidance-headline">{support.window.headline}</h3>
        <p className="body" data-testid="guidance-context">{support.window.context}</p>
        <ul className="guidance-list" data-testid="guidance-may-notice">
          {support.window.mayNotice.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <section className="daily-practice" data-testid="daily-practice">
          <p className="micro-label">One thing to try today</p>
          <h4>{support.practice.title}</h4>
          <p className="body">{support.practice.action}</p>
        </section>
      </details>
      <details className="result-disclosure" data-testid="today-experiences">
        <summary>Experiences</summary>
        <CommunityCarousel key={support.day} tips={support.communityTips} initialId={support.communityTip.id} />
      </details>
      {comparison.available ? (
        <details className="result-disclosure" data-testid="today-comparison">
          <summary>Your recorded changes</summary>
          <CheckinComparisonBlock view={comparison} />
        </details>
      ) : null}
    </>
  );
}
