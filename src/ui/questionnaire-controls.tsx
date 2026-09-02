import { useRef, useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import type { DetectionContext, DetectionMatrix, Goal, ProductKind, Route } from '../domain/schemas/enums.ts';
import {
  DATE_CHIPS,
  DAY_PARTS,
  dateInputBounds,
  localIsoDate,
  resolveDateChip,
  resolvePickedDate,
  type DateChipId,
  type DateWindowKind,
  type DayPart,
} from '../application/questionnaire/date-answers.ts';
import {
  BREAK_OPTIONS,
  CONTEXT_OPTIONS,
  DATE_CHIP_LABELS,
  DAY_PART_LABELS,
  MATRIX_OPTIONS,
  PRODUCT_GROUP_LABEL,
  PRODUCT_OPTIONS,
  QUESTIONNAIRE,
  ROUTE_GROUP_LABEL,
  ROUTE_OPTIONS,
  SESSION_CHIPS,
  USE_DAY_PRESETS,
} from './questionnaire-copy.ts';
import { GOAL_CHIPS } from './copy.ts';
import {
  BreakNoIcon,
  BreakYesIcon,
  CheckIcon,
  contextIcon,
  goalIcon,
  matrixIcon,
  productIcon,
  routeIcon,
} from './icons.tsx';

export function GoalCards({ onSelect }: { readonly onSelect: (goal: Goal) => void }) {
  return (
    <div className="choice-list">
      {GOAL_CHIPS.map((goal) => (
        <button
          key={goal.id}
          type="button"
          className="choice-card"
          data-goal={goal.id}
          onClick={() => onSelect(goal.id)}
        >
          <span className="choice-icon">{goalIcon(goal.id, { size: 20 })}</span>
          <span className="choice-copy">
            <span className="choice-title">{goal.title}</span>
            <span className="meta">{goal.helper}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function BreakCards({
  selected,
  onSelect,
}: {
  readonly selected?: boolean;
  readonly onSelect: (value: boolean) => void;
}) {
  return (
    <div className="choice-list">
      {BREAK_OPTIONS.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={cardClass(selected === option.value)}
          data-break={option.value ? 'yes' : 'no'}
          onClick={() => onSelect(option.value)}
        >
          <span className="choice-icon">
            {option.value ? <BreakYesIcon size={20} /> : <BreakNoIcon size={20} />}
          </span>
          <span className="choice-copy">
            <span className="choice-title">{option.title}</span>
            <span className="meta">{option.helper}</span>
          </span>
          <span className="choice-check">
            <CheckIcon size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function MatrixCards({
  selected,
  onSelect,
}: {
  readonly selected?: DetectionMatrix;
  readonly onSelect: (value: DetectionMatrix) => void;
}) {
  return (
    <div className="choice-list">
      {MATRIX_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cardClass(selected === option.id)}
          data-matrix={option.id}
          onClick={() => onSelect(option.id)}
        >
          <span className="choice-icon">{matrixIcon(option.id, { size: 20 })}</span>
          <span className="choice-copy">
            <span className="choice-title">{option.title}</span>
          </span>
          <span className="choice-check">
            <CheckIcon size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function ContextCards({
  selected,
  onSelect,
}: {
  readonly selected?: DetectionContext;
  readonly onSelect: (value: DetectionContext) => void;
}) {
  return (
    <div className="choice-list">
      {CONTEXT_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          className={cardClass(selected === option.id)}
          data-context={option.id}
          onClick={() => onSelect(option.id)}
        >
          <span className="choice-icon">{contextIcon(option.id, { size: 20 })}</span>
          <span className="choice-copy">
            <span className="choice-title">{option.title}</span>
          </span>
          <span className="choice-check">
            <CheckIcon size={16} />
          </span>
        </button>
      ))}
    </div>
  );
}

export function UseDaysSlider({
  value,
  onChange,
}: {
  readonly value: number | null;
  readonly onChange: (value: number) => void;
}) {
  const shown = value ?? 0;
  const pct = `${(shown / 30) * 100}%`;
  return (
    <div className="control-stack">
      <div className="slider-stage">
        <p className="slider-readout" data-testid="use-days-readout" aria-live="polite">
          {shown}
        </p>
        <p className="slider-unit">days in the last 30</p>
      </div>
      <div className="slider-wrap" style={{ '--slider-pct': pct } as Record<string, string>}>
        <input
          type="range"
          min={0}
          max={30}
          step={1}
          value={shown}
          aria-valuemin={0}
          aria-valuemax={30}
          aria-valuenow={shown}
          aria-label="Days you used THC in the last 30 days"
          data-testid="use-days-slider"
          className="slider"
          onInput={(event) => onChange(Number((event.target as HTMLInputElement).value))}
        />
      </div>
      <div className="slider-ticks" aria-hidden="true">
        <span>0</span>
        <span>10</span>
        <span>20</span>
        <span>30</span>
      </div>
      <div className="chip-row">
        {USE_DAY_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={chipClass(value === preset.value)}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SessionsControl({
  value,
  onChange,
}: {
  readonly value: number | null;
  readonly onChange: (value: number) => void;
}) {
  const [numericOpen, setNumericOpen] = useState(false);
  const shown = value ?? 1;
  const shownRef = useRef(shown);
  shownRef.current = shown;

  return (
    <div className="control-stack">
      <div className="chip-row">
        {SESSION_CHIPS.map((chip) => (
          <button
            key={chip.label}
            type="button"
            className={chipClass(chip.value === 3 ? shown >= 3 : shown === chip.value)}
            onClick={() => onChange(chip.value)}
          >
            {chip.label}
          </button>
        ))}
      </div>
      <div className="stepper">
        <HoldButton
          ariaLabel="Decrease sessions"
          onStep={() => onChange(Math.max(1, shownRef.current - 1))}
        >
          −
        </HoldButton>
        <button
          type="button"
          className="stepper-value"
          aria-label={QUESTIONNAIRE.sessionsValue}
          data-testid="sessions-value"
          onClick={() => setNumericOpen(true)}
        >
          {shown}
        </button>
        <HoldButton
          ariaLabel="Increase sessions"
          onStep={() => onChange(Math.min(9, shownRef.current + 1))}
        >
          +
        </HoldButton>
      </div>
      {numericOpen ? (
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={9}
          value={shown}
          data-testid="sessions-numeric"
          aria-label={QUESTIONNAIRE.sessionsValue}
          className="numeric-pad"
          onInput={(event) => {
            const next = Number((event.target as HTMLInputElement).value);
            if (Number.isInteger(next) && next >= 1 && next <= 9) onChange(next);
          }}
        />
      ) : null}
    </div>
  );
}

export function ProductsRoutesControl({
  products,
  routes,
  onChange,
}: {
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly onChange: (next: { products: readonly ProductKind[]; routes: readonly Route[] }) => void;
}) {
  function toggleProduct(id: ProductKind) {
    const next = products.includes(id) ? products.filter((item) => item !== id) : [...products, id];
    onChange({ products: next, routes });
  }
  function toggleRoute(id: Route) {
    const next = routes.includes(id) ? routes.filter((item) => item !== id) : [...routes, id];
    onChange({ products, routes: next });
  }
  return (
    <div className="control-stack">
      <p className="micro-label">{PRODUCT_GROUP_LABEL}</p>
      <div className="tile-grid">
        {PRODUCT_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={tileClass(products.includes(option.id))}
            aria-pressed={products.includes(option.id)}
            data-product={option.id}
            onClick={() => toggleProduct(option.id)}
          >
            {productIcon(option.id, { size: 22 })}
            <span className="choice-title">{option.title}</span>
            {option.helper ? <span className="meta">{option.helper}</span> : null}
          </button>
        ))}
      </div>
      {products.includes('flower') ? (
        <p className="meta" data-testid="nominal-thc-deferred">
          {QUESTIONNAIRE.flowerThcLink}
        </p>
      ) : null}
      <p className="micro-label">{ROUTE_GROUP_LABEL}</p>
      <div className="tile-grid">
        {ROUTE_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            className={tileClass(routes.includes(option.id))}
            aria-pressed={routes.includes(option.id)}
            data-route={option.id}
            onClick={() => toggleRoute(option.id)}
          >
            {routeIcon(option.id, { size: 22 })}
            <span className="choice-title">{option.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DateControl({
  window,
  now,
  value,
  showStillUse,
  from,
  onChange,
}: {
  readonly window: DateWindowKind;
  readonly now: Instant;
  readonly value?: string;
  readonly showStillUse?: boolean;
  /** Lower instant bound for the `since_anchor` window (interruption). */
  readonly from?: Instant;
  readonly onChange: (iso: string) => void;
}) {
  const [chip, setChip] = useState<DateChipId | 'pick' | 'still' | null>(null);
  const [dayPart, setDayPart] = useState<DayPart>('afternoon');
  const parsedValue = value === undefined ? Number.NaN : Date.parse(value);
  const [picked, setPicked] = useState(
    Number.isFinite(parsedValue) ? localIsoDate(parsedValue as Instant) : '',
  );
  const bounds = dateInputBounds(now, window, from);

  function applyPicked(nextDate: string, nextPart: DayPart) {
    const iso = resolvePickedDate(nextDate, nextPart, now, window, from);
    if (iso !== null) onChange(iso);
  }

  function applyChip(nextChip: DateChipId, nextPart: DayPart) {
    const iso = resolveDateChip(nextChip, nextPart, now, window, from);
    if (iso !== null) onChange(iso);
  }

  return (
    <div className="control-stack">
      <div className="chip-row">
        {DATE_CHIPS.map((id) => {
          const iso = resolveDateChip(id, dayPart, now, window, from);
          if (iso === null && id !== 'today') return null;
          if (id === 'today' && resolveDateChip('today', dayPart, now, window, from) === null) return null;
          return (
            <button
              key={id}
              type="button"
              className={chipClass(chip === id)}
              data-date-chip={id}
              onClick={() => {
                setChip(id);
                applyChip(id, dayPart);
              }}
            >
              {DATE_CHIP_LABELS[id]}
            </button>
          );
        })}
        <button
          type="button"
          className={chipClass(chip === 'pick')}
          data-date-chip="pick"
          onClick={() => setChip('pick')}
        >
          {QUESTIONNAIRE.pickADate}
        </button>
        {showStillUse ? (
          <button
            type="button"
            className={chipClass(chip === 'still')}
            data-date-chip="still-use"
            onClick={() => {
              setChip('still');
              const iso = resolveDateChip('today', 'morning', now, window, from);
              if (iso !== null) onChange(iso);
            }}
          >
            {QUESTIONNAIRE.stillUseToday}
          </button>
        ) : null}
      </div>
      {chip === 'pick' ? (
        <input
          type="date"
          min={bounds.min}
          max={bounds.max}
          value={picked}
          data-testid="date-picker"
          aria-label={QUESTIONNAIRE.pickADate}
          onInput={(event) => {
            const next = (event.target as HTMLInputElement).value;
            setPicked(next);
            applyPicked(next, dayPart);
          }}
        />
      ) : null}
      {chip !== 'today' && chip !== 'still' ? (
        <div className="chip-row" role="group" aria-label="Time of day">
          {DAY_PARTS.map((part) => (
            <button
              key={part}
              type="button"
              className={chipClass(dayPart === part)}
              data-day-part={part}
              onClick={() => {
                setDayPart(part);
                if (chip === 'pick' && picked !== '') applyPicked(picked, part);
                else if (chip !== null && chip !== 'pick') applyChip(chip, part);
              }}
            >
              {DAY_PART_LABELS[part]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function HoldButton({
  ariaLabel,
  onStep,
  children,
}: {
  readonly ariaLabel: string;
  readonly onStep: () => void;
  readonly children: string;
}) {
  const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heldRef = useRef(false);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  function stop() {
    if (delayRef.current !== null) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
    if (holdRef.current !== null) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  }

  return (
    <button
      type="button"
      className="stepper-button"
      aria-label={ariaLabel}
      onClick={() => {
        if (heldRef.current) return;
        onStepRef.current();
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        heldRef.current = false;
        stop();
        delayRef.current = setTimeout(() => {
          heldRef.current = true;
          onStepRef.current();
          holdRef.current = setInterval(() => onStepRef.current(), 120);
        }, 400);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
    >
      {children}
    </button>
  );
}

function cardClass(selected: boolean): string {
  return selected ? 'choice-card selected' : 'choice-card';
}

function chipClass(selected: boolean): string {
  return selected ? 'chip selected' : 'chip';
}

function tileClass(selected: boolean): string {
  return selected ? 'tile selected' : 'tile';
}
