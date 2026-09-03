import type { WithdrawalView } from '../application/presentation/result-presentation.ts';
import { aroundDay, RESULT, WITHDRAWAL_STOP_LABELS } from './result-copy.ts';
import { TrackDot } from './icons.tsx';

export function WithdrawalTrack({ withdrawal }: { readonly withdrawal: WithdrawalView }) {
  const timed = withdrawal.stops.filter((stop) => stop.anchor !== 'sleep_disturbance');
  const sleep = withdrawal.stops.find((stop) => stop.anchor === 'sleep_disturbance');

  return (
    <section className="withdrawal-panel" data-testid="withdrawal-track">
      <p className="micro-label">Typical patterns</p>
      <h3 className="card-title">{RESULT.withdrawalHeader}</h3>
      <p className="body" data-testid="break-day">
        {aroundDay(withdrawal.breakDay)}
      </p>
      <ol className="withdrawal-track">
        {timed.map((stop) => (
          <li key={stop.anchor} className="withdrawal-stop" data-anchor={stop.anchor} data-status={stop.status ?? 'none'}>
            <span className="withdrawal-mark">
              <TrackDot status={stop.status ?? 'none'} />
            </span>
            <span>
              <span className="choice-title">{WITHDRAWAL_STOP_LABELS[stop.anchor]}</span>
              {stop.statusLabel ? <span className="meta"> {stop.statusLabel}</span> : null}
            </span>
          </li>
        ))}
        {sleep ? (
          <li
            key={sleep.anchor}
            className="withdrawal-stop"
            data-anchor={sleep.anchor}
            data-status={sleep.status ?? 'none'}
          >
            <span className="withdrawal-mark">
              <TrackDot status="none" />
            </span>
            <span>
              <span className="choice-title">{WITHDRAWAL_STOP_LABELS.sleep_disturbance}</span>
              <span className="meta"> {RESULT.sleepCopy}</span>
            </span>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
