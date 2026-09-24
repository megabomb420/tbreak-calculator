import { CommunityCarousel } from './community-carousel.tsx';
import { DailySupport } from './daily-support.tsx';
import { CheckinComparisonBlock } from './checkin-comparison.tsx';
import { compareCheckins } from '../application/presentation/checkin-comparison.ts';
import type { DailySupportView } from '../application/presentation/daily-support.ts';

/**
 * The daily guidance block every Today state shows: one support card, then the
 * stage it belongs to, the experiences for that stage and the recorded
 * differences — all visible, so nothing on Today hides behind a disclosure.
 */
export function DailyGuidance({ support }: { readonly support: DailySupportView }) {
  const comparison = compareCheckins(support.currentCheckins, { breakDay: support.day });
  return (
    <>
      <DailySupport view={support} />
      <section className="result-disclosure today-block" data-testid="today-stage">
        <h3 className="card-title">This stage</h3>
        <p className="micro-label">{support.window.label} · What to expect</p>
        <p className="body" data-testid="guidance-headline">{support.window.headline}</p>
        <p className="body" data-testid="guidance-context">{support.window.context}</p>
        <ul className="guidance-list" data-testid="guidance-may-notice">
          {support.window.mayNotice.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <section className="daily-practice" data-testid="daily-practice">
          <p className="micro-label">One thing to try today</p>
          <h4>{support.practice.title}</h4>
          <p className="body">{support.practice.action}</p>
        </section>
      </section>
      <section className="result-disclosure today-block" data-testid="today-experiences">
        <h3 className="card-title">Experiences</h3>
        <CommunityCarousel key={support.day} tips={support.communityTips} initialId={support.communityTip.id} />
      </section>
      {comparison.available ? (
        <section className="result-disclosure today-block" data-testid="today-comparison">
          <h3 className="card-title">Your recorded changes</h3>
          <CheckinComparisonBlock view={comparison} />
        </section>
      ) : null}
    </>
  );
}
