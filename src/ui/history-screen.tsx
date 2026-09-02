import { HISTORY_EMPTY } from './copy.ts';

export function HistoryScreen() {
  return (
    <section className="history-screen" data-testid="history-view">
      <article className="card">
        <p className="micro-label">History</p>
        <p className="body">{HISTORY_EMPTY}</p>
      </article>
    </section>
  );
}
