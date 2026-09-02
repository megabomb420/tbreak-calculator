import { HISTORY_EMPTY } from './copy.ts';
import { IntervalMark } from './icons.tsx';

export function HistoryScreen() {
  return (
    <section className="history-screen" data-testid="history-view">
      <div className="history-empty">
        <div className="brand-mark">
          <IntervalMark size={32} />
        </div>
        <p className="eyebrow">History</p>
        <p className="title">{HISTORY_EMPTY}</p>
        <p className="meta">Past calculations and breaks will collect here.</p>
      </div>
    </section>
  );
}
