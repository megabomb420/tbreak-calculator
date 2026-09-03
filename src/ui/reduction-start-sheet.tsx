// Start / edit sheet for an active reduction (cut-down) plan. The limits are
// the user's own behavioural precommitment, never a medically proven dose.

import { useRef, useState } from 'preact/hooks';
import type { UseProfileInput } from '../domain/schemas/profile.ts';
import type { Instant } from '../domain/schemas/time.ts';
import {
  suggestedReductionLimits,
  type ReductionLimits,
  type ReductionPlan,
  type ThcStrategy,
} from '../domain/reduction/reduction-engine.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

const REDUCTION_START = {
  title: 'Your cut-down plan',
  close: 'Close cut-down plan',
  daysLimit: 'Max use days per week',
  sessionsLimit: 'Max sessions on a use day',
  strategyHeading: 'Your strategy (optional)',
  strategyHelper: 'Pick any that fit how you want to cut down.',
  heuristicNote: 'These are your own behavioural limits, not a medically proven dose.',
  start: 'Start plan',
  save: 'Save changes',
  cancel: 'Cancel',
  alreadyRunning: 'A plan is already running.',
  suggestedPrefix: 'Suggested from your pattern:',
  suggestedSuffix: 'you set the final limits.',
} as const;

const STRATEGY_OPTIONS: ReadonlyArray<{
  readonly key: keyof ThcStrategy;
  readonly label: string;
  readonly testId: string;
}> = [
  { key: 'avoidConcentrates', label: 'Avoid concentrates', testId: 'strategy-avoid-concentrates' },
  { key: 'lowerPotency', label: 'Lower-potency products', testId: 'strategy-lower-potency' },
  { key: 'lowerAmount', label: 'Substantially lower amounts', testId: 'strategy-lower-amount' },
];

/** App defaults when neither an existing plan nor a profile is available. */
const FALLBACK_LIMITS: ReductionLimits = { maxUseDaysPerWeek: 3, maxSessionsPerUseDay: 1 };

function suggestionLine(suggested: ReductionLimits): string {
  const days =
    suggested.maxUseDaysPerWeek === 1 ? '1 day/week' : `${suggested.maxUseDaysPerWeek} days/week`;
  const sessions =
    suggested.maxSessionsPerUseDay === 1
      ? '1 session/use day'
      : `${suggested.maxSessionsPerUseDay} sessions/use day`;
  return `${REDUCTION_START.suggestedPrefix} ${days} \u00b7 ${sessions} \u2014 ${REDUCTION_START.suggestedSuffix}`;
}

export interface ReductionStartSheetProps {
  readonly now: Instant;
  /** Saved questionnaire profile, used only to suggest starting limits. */
  readonly profile: UseProfileInput | null;
  /** Live plan being edited, or null when creating a new one. */
  readonly existing: ReductionPlan | null;
  readonly onStart: (limits: ReductionLimits, strategy: ThcStrategy) => boolean;
  readonly onCommit: (limits: ReductionLimits, strategy: ThcStrategy) => boolean;
  readonly onClose: () => void;
}

export function ReductionStartSheet({
  profile,
  existing,
  onStart,
  onCommit,
  onClose,
}: ReductionStartSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const suggested =
    profile === null
      ? null
      : suggestedReductionLimits({
          thcUseDaysLast30: profile.thcUseDaysLast30?.value ?? 0,
          sessionsPerUseDay: profile.sessionsPerUseDay?.value ?? null,
        });
  const initial: ReductionLimits =
    existing?.limits ?? suggested ?? FALLBACK_LIMITS;
  const [days, setDays] = useState(initial.maxUseDaysPerWeek);
  const [sessions, setSessions] = useState(initial.maxSessionsPerUseDay);
  const [strategy, setStrategy] = useState<ThcStrategy>(
    existing?.strategy ?? { avoidConcentrates: false, lowerPotency: false, lowerAmount: false },
  );
  const [failed, setFailed] = useState(false);

  const editing = existing !== null;

  function toggleStrategy(key: keyof ThcStrategy, checked: boolean): void {
    setStrategy((current) => ({ ...current, [key]: checked }));
    setFailed(false);
  }

  function save(): void {
    const limits: ReductionLimits = { maxUseDaysPerWeek: days, maxSessionsPerUseDay: sessions };
    const saved = editing ? onCommit(limits, strategy) : onStart(limits, strategy);
    if (!saved) {
      setFailed(true);
      return;
    }
    // The app handler closes the sheet on success.
  }

  const titleId = 'reduction-start-title';

  return (
    <div className="modal-root" data-testid="reduction-start-sheet" ref={rootRef}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 id={titleId} className="card-title">
            {REDUCTION_START.title}
          </h2>
          <button type="button" className="icon-button" aria-label={REDUCTION_START.close} onClick={onClose}>
            <CloseIcon />
          </button>
        </header>
        <div className="modal-body stack">
          {suggested !== null && !editing ? (
            <p className="meta" data-testid="reduction-suggestion">
              {suggestionLine(suggested)}
            </p>
          ) : null}
          <section>
            <p className="micro-label" id="reduction-days-label">
              {REDUCTION_START.daysLimit}
            </p>
            <div className="stepper">
              <button
                type="button"
                className="stepper-button"
                aria-label={`Decrease ${REDUCTION_START.daysLimit}`}
                data-testid="limit-days-dec"
                onClick={() => setDays((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <output className="stepper-value" data-testid="limit-days" aria-labelledby="reduction-days-label">
                {days}
              </output>
              <button
                type="button"
                className="stepper-button"
                aria-label={`Increase ${REDUCTION_START.daysLimit}`}
                data-testid="limit-days-inc"
                onClick={() => setDays((value) => Math.min(7, value + 1))}
              >
                +
              </button>
            </div>
          </section>
          <section>
            <p className="micro-label" id="reduction-sessions-label">
              {REDUCTION_START.sessionsLimit}
            </p>
            <div className="stepper">
              <button
                type="button"
                className="stepper-button"
                aria-label={`Decrease ${REDUCTION_START.sessionsLimit}`}
                data-testid="limit-sessions-dec"
                onClick={() => setSessions((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <output className="stepper-value" data-testid="limit-sessions" aria-labelledby="reduction-sessions-label">
                {sessions}
              </output>
              <button
                type="button"
                className="stepper-button"
                aria-label={`Increase ${REDUCTION_START.sessionsLimit}`}
                data-testid="limit-sessions-inc"
                onClick={() => setSessions((value) => Math.min(9, value + 1))}
              >
                +
              </button>
            </div>
          </section>
          <section>
            <h3 className="card-title">{REDUCTION_START.strategyHeading}</h3>
            <p className="meta">{REDUCTION_START.strategyHelper}</p>
            <div className="choice-list">
              {STRATEGY_OPTIONS.map((option) => (
                <label
                  key={option.key}
                  className="choice-card compact"
                  data-testid={option.testId}
                >
                  <span className="choice-icon" aria-hidden="true">
                    <input
                      type="checkbox"
                      checked={strategy[option.key]}
                      onChange={(event) =>
                        toggleStrategy(option.key, (event.target as HTMLInputElement).checked)
                      }
                    />
                  </span>
                  <span className="choice-copy">
                    <span className="choice-title">{option.label}</span>
                  </span>
                </label>
              ))}
            </div>
          </section>
          <p className="meta" data-testid="reduction-heuristic-note">
            {REDUCTION_START.heuristicNote}
          </p>
          {failed ? (
            <p className="meta" data-testid="reduction-start-error">
              {REDUCTION_START.alreadyRunning}
            </p>
          ) : null}
        </div>
        <footer className="sheet-actions">
          <button
            type="button"
            className="cta-primary"
            data-testid="reduction-start-save"
            onClick={save}
          >
            {editing ? REDUCTION_START.save : REDUCTION_START.start}
          </button>
          <button type="button" className="cta-secondary" onClick={onClose}>
            {REDUCTION_START.cancel}
          </button>
        </footer>
      </div>
    </div>
  );
}
