import { useState } from 'preact/hooks';
import type { ReductionPlan, UseEvent } from '../domain/reduction/reduction-engine.ts';
import { reductionStatusLabel } from '../application/history/history-model.ts';
import { formatLocalDay } from './format.ts';
import { PRODUCT_OPTIONS, ROUTE_OPTIONS } from './questionnaire-copy.ts';
import { HISTORY } from './copy.ts';
import { ConfirmDialog } from './confirm-dialog.tsx';

export function ReductionHistory({ plan, onBack, onDelete, onRemoveEvent }: {
  readonly plan: ReductionPlan;
  readonly onBack: () => void;
  readonly onDelete: () => void;
  readonly onRemoveEvent: (planId: string, eventId: string) => void;
}) {
  const [removing, setRemoving] = useState<UseEvent | null>(null);
  const events = [...plan.events].sort((a, b) => b.usedAt - a.usedAt);
  return (
    <section className="history-detail stack" data-testid="reduction-history">
      <button type="button" className="text-back" onClick={onBack}>{HISTORY.closeDetail}</button>
      <header>
        <p className="eyebrow">{reductionStatusLabel(plan)}</p>
        <h2 className="title">Your cut-down plan</h2>
        <p className="meta">Started {formatLocalDay(plan.startedAt)}</p>
      </header>
      <section>
        <h3 className="card-title">Your limits</h3>
        <p className="body">Up to {plan.limits.maxUseDaysPerWeek} use {plan.limits.maxUseDaysPerWeek === 1 ? 'day' : 'days'} a week · up to {plan.limits.maxSessionsPerUseDay} {plan.limits.maxSessionsPerUseDay === 1 ? 'session' : 'sessions'} on a use day.</p>
        {plan.strategy.avoidConcentrates ? <p className="meta">Avoid concentrates</p> : null}
        {plan.strategy.lowerPotency ? <p className="meta">Lower-potency products</p> : null}
        {plan.strategy.lowerAmount ? <p className="meta">Lower amounts</p> : null}
      </section>
      <section>
        <h3 className="card-title">Logged use</h3>
        <p className="meta">Each entry is one session. Remove an entry if it was recorded by mistake.</p>
        {events.length === 0 ? <p className="body">No sessions logged.</p> : <ul className="history-list">
          {events.map((event) => {
            const product = PRODUCT_OPTIONS.find((option) => option.id === event.product)?.title ?? event.product;
            const route = ROUTE_OPTIONS.find((option) => option.id === event.route)?.title ?? event.route;
            const time = new Date(event.usedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
            return <li className="history-static-row use-history-row" key={event.id} data-testid="use-history-row">
              <div><p className="history-row-title">{product} · {route}</p><p className="meta">{formatLocalDay(event.usedAt)} · {time}</p></div>
              <button type="button" className="text-back" aria-label={`Remove ${product} session on ${formatLocalDay(event.usedAt)} at ${time}`} onClick={() => setRemoving(event)}>Remove</button>
            </li>;
          })}
        </ul>}
      </section>
      <p className="meta">Counts reflect what you recorded. Saved calculations stay as they were; refresh your recommendation separately if needed.</p>
      <button type="button" className="cta-danger" data-testid="history-delete" onClick={onDelete}>{HISTORY.delete}</button>
      {removing !== null ? <ConfirmDialog title="Remove this session?" body="This corrects the plan’s use log and current counts. Saved calculations stay unchanged." action="Remove session" onConfirm={() => {
        onRemoveEvent(plan.id, removing.id); setRemoving(null);
      }} onCancel={() => setRemoving(null)} /> : null}
    </section>
  );
}
