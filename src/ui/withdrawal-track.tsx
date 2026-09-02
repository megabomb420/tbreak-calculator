import type { WithdrawalView } from '../application/presentation/result-presentation.ts';
import { aroundDay, RESULT, WITHDRAWAL_STOP_LABELS } from './result-copy.ts';

export function WithdrawalTrack({ withdrawal }: { readonly withdrawal: WithdrawalView }) {
  return (
    <section className="card" data-testid="withdrawal-track">
      <p className="micro-label">First weeks</p>
      <h3 className="card-title">{RESULT.withdrawalHeader}</h3>
      <p className="body" data-testid="break-day">
        {aroundDay(withdrawal.breakDay)}
      </p>
      <ol className="withdrawal-track">
        {withdrawal.stops.map((stop) => (
          <li key={stop.anchor} className="withdrawal-stop" data-anchor={stop.anchor} data-status={stop.status ?? 'none'}>
            <span className="withdrawal-mark" aria-hidden="true">
              {stop.status === 'current' ? '●' : stop.status === 'past' ? '✓' : stop.status === 'upcoming' ? '○' : '–'}
            </span>
            <span>
              <span className="choice-title">{WITHDRAWAL_STOP_LABELS[stop.anchor]}</span>
              {stop.anchor === 'sleep_disturbance' ? (
                <span className="meta"> {RESULT.sleepCopy}</span>
              ) : stop.statusLabel ? (
                <span className="meta"> {stop.statusLabel}</span>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
