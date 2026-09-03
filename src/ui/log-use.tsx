// Quick THC-use log sheet for an active reduction plan (v2 plan tracker).
// One logged event = one session. Time is coarse on purpose: a full date
// picker is unnecessary for the rolling-7-day plan state.

import { useRef, useState } from 'preact/hooks';
import type { ProductKind, Route } from '../domain/schemas/enums.ts';
import type { ReductionPlan } from '../domain/reduction/reduction-engine.ts';
import {
  MILLIS_PER_DAY,
  MILLIS_PER_HOUR,
  toInstant,
  type Instant,
} from '../domain/schemas/time.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

const LOG_USE = {
  title: 'Log THC use',
  close: 'Close log use',
  when: 'When did you use?',
  product: 'What did you use?',
  productHelper: 'Pick one.',
  route: 'How did you take it?',
  useAgainPrefix: 'Use again: ',
  save: 'Save',
  cancel: 'Cancel',
  saveFailed: 'Could not save this use event.',
} as const;

const PRODUCT_CHIPS: ReadonlyArray<{ readonly id: ProductKind; readonly label: string }> = [
  { id: 'flower', label: 'Flower' },
  { id: 'vape', label: 'Vape' },
  { id: 'concentrate', label: 'Dab / concentrate' },
  { id: 'edible', label: 'Edible' },
  { id: 'oil', label: 'Oil' },
  { id: 'other', label: 'Other' },
];

const ROUTES: readonly Route[] = ['smoking', 'vaping', 'dabbing', 'oral', 'sublingual', 'other'];

const ROUTE_LABELS: Record<Route, string> = {
  smoking: 'Smoking',
  vaping: 'Vaping',
  dabbing: 'Dabbing',
  oral: 'Oral',
  sublingual: 'Sublingual',
  other: 'Other',
};

const DEFAULT_ROUTE: Record<ProductKind, Route> = {
  flower: 'smoking',
  vape: 'vaping',
  concentrate: 'dabbing',
  edible: 'oral',
  oil: 'sublingual',
  other: 'other',
};

const TIME_CHIPS: ReadonlyArray<{
  readonly id: 'now' | '1h' | '2h' | 'yesterday';
  readonly label: string;
  readonly offsetMs: number;
}> = [
  { id: 'now', label: 'Now', offsetMs: 0 },
  { id: '1h', label: '1 hour ago', offsetMs: -MILLIS_PER_HOUR },
  { id: '2h', label: '2 hours ago', offsetMs: -2 * MILLIS_PER_HOUR },
  { id: 'yesterday', label: 'Yesterday', offsetMs: -MILLIS_PER_DAY },
];

function productLabel(product: ProductKind): string {
  return PRODUCT_CHIPS.find((chip) => chip.id === product)?.label ?? product;
}

export interface LogUseSheetProps {
  readonly plan: ReductionPlan;
  readonly now: Instant;
  readonly onLog: (usedAt: Instant, product: ProductKind, route: Route) => boolean;
  readonly onClose: () => void;
}

export function LogUseSheet({ plan, now, onLog, onClose }: LogUseSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [timeId, setTimeId] = useState<'now' | '1h' | '2h' | 'yesterday'>('now');
  const [product, setProduct] = useState<ProductKind | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [failed, setFailed] = useState(false);

  const chip = TIME_CHIPS.find((item) => item.id === timeId) ?? TIME_CHIPS[0]!;
  const usedAt = toInstant(now + chip.offsetMs);
  const latest =
    plan.events.length === 0
      ? null
      : plan.events.reduce((a, b) => (a.usedAt >= b.usedAt ? a : b));

  function selectProduct(next: ProductKind): void {
    setProduct(next);
    setRoute(DEFAULT_ROUTE[next]);
    setFailed(false);
  }

  function save(): void {
    if (product === null || route === null) return;
    if (onLog(usedAt, product, route)) {
      onClose();
      return;
    }
    setFailed(true);
  }

  function useAgain(): void {
    if (latest === null) return;
    setProduct(latest.product);
    setRoute(latest.route);
    setFailed(false);
    window.requestAnimationFrame(() => {
      saveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  return (
    <div
      className="questionnaire-overlay"
      data-testid="log-use"
      role="dialog"
      aria-modal="true"
      aria-labelledby="log-use-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={LOG_USE.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="log-use-title" className="flow-title">
          {LOG_USE.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <div className="stack">
          {latest !== null ? (
            <button
              type="button"
              className="chip"
              data-testid="log-use-again"
              onClick={useAgain}
            >
              {LOG_USE.useAgainPrefix}
              {`${productLabel(latest.product)} · ${ROUTE_LABELS[latest.route]}`}
            </button>
          ) : null}
          <section>
            <p className="micro-label" id="log-time-label">
              {LOG_USE.when}
            </p>
            <div className="chip-row">
              {TIME_CHIPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={timeId === item.id ? 'chip selected' : 'chip'}
                  aria-pressed={timeId === item.id}
                  data-testid={`log-time-${item.id}`}
                  onClick={() => setTimeId(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="micro-label" id="log-product-label">
              {LOG_USE.product}
            </p>
            <p className="meta">{LOG_USE.productHelper}</p>
            <div className="chip-row wrap" role="group" aria-labelledby="log-product-label">
              {PRODUCT_CHIPS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={product === item.id ? 'chip selected' : 'chip'}
                  aria-pressed={product === item.id}
                  data-testid="log-product"
                  data-value={item.id}
                  onClick={() => selectProduct(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
          {product !== null ? (
            <section>
              <label className="micro-label" id="log-route-label" htmlFor="log-route-select">
                {LOG_USE.route}
              </label>
              <select
                id="log-route-select"
                className="date-input"
                data-testid="log-route"
                value={route ?? ''}
                aria-labelledby="log-route-label"
                onChange={(event) => {
                  const next = (event.target as HTMLSelectElement).value as Route;
                  setRoute(next);
                  setFailed(false);
                }}
              >
                {ROUTES.map((item) => (
                  <option key={item} value={item}>
                    {ROUTE_LABELS[item]}
                  </option>
                ))}
              </select>
            </section>
          ) : null}
          {failed ? (
            <p className="meta" data-testid="log-use-error">
              {LOG_USE.saveFailed}
            </p>
          ) : null}
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button type="button" className="cta-secondary" onClick={onClose}>
          {LOG_USE.cancel}
        </button>
        <button
          type="button"
          className="cta-primary"
          disabled={product === null || route === null}
          data-testid="log-use-save"
          ref={saveRef}
          onClick={save}
        >
          {LOG_USE.save}
        </button>
      </footer>
    </div>
  );
}
