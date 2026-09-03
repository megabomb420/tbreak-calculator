import type { CheckinComparisonView } from '../application/presentation/checkin-comparison.ts';
import { CHECKIN_COMPARISON_COPY } from '../domain/guidance/evidence-guidance-v1.ts';
import { GUIDANCE_CHROME } from './break-copy.ts';

export function CheckinComparisonBlock({ view }: { readonly view: CheckinComparisonView }) {
  if (!view.available) return null;
  return (
    <section className="then-now" data-testid="checkin-comparison">
      <h3 className="guidance-kicker">{GUIDANCE_CHROME.thenNow}</h3>
      <ul className="then-now-list">
        {view.comparisons.map((row) => (
          <li key={row.field} data-field={row.field} data-direction={row.direction}>
            <span className="then-now-copy">{row.copy}</span>
            <span className="then-now-values meta">
              {row.earliestValue} → {row.latestValue}
            </span>
          </li>
        ))}
      </ul>
      <p className="meta">{CHECKIN_COMPARISON_COPY.helper}</p>
    </section>
  );
}
