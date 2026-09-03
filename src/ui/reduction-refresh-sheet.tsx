// Minimal profile refresh for an active reduction plan. The user confirms how
// many of the last 30 days were use days (prefilled from tracked events) plus
// the current pattern duration; the app then freezes a NEW calculation. It
// never fabricates a 30-day history — partial tracking is labelled as tracked
// so far.

import { useRef, useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import type { ObservedPattern, ReductionBaseline } from '../domain/reduction/reduction-engine.ts';
import { PATTERN_DURATION_OPTIONS } from './questionnaire-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

const REDUCTION_REFRESH = {
  title: 'Update your pattern',
  close: 'Close pattern update',
  lead: 'Your recent use has changed. Update your current pattern to refresh your break recommendation.',
  daysLabel: 'Days you used THC in the last 30 days',
  daysTrackedSuffix: (tracked: number) => ` (tracked so far: ${tracked})`,
  durationHeading: 'How long has this pattern been typical?',
  durationUnknown: 'Prefer not to say / unknown',
  continue: 'Continue',
  back: 'Back',
  save: 'Save',
  cancel: 'Cancel',
} as const;

export interface ReductionRefreshAnswers {
  readonly thcUseDaysLast30: number;
  readonly currentPatternDuration: string | null;
}

export interface ReductionRefreshSheetProps {
  readonly now: Instant;
  /** Exact pattern derived from the plan's tracked events. */
  readonly observed: ObservedPattern;
  /** The user's original estimated baseline when the plan started. */
  readonly baseline: ReductionBaseline;
  readonly onRefresh: (answers: ReductionRefreshAnswers) => void;
  readonly onClose: () => void;
}

export function ReductionRefreshSheet({
  observed,
  baseline,
  onRefresh,
  onClose,
}: ReductionRefreshSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [step, setStep] = useState<'days' | 'duration'>('days');
  const [days, setDays] = useState(observed.useDaysLast30);
  const [duration, setDuration] = useState<string | null>(baseline.currentPatternDuration);

  const partial = !observed.hasFullThirtyDayCoverage;
  const daysLabel =
    REDUCTION_REFRESH.daysLabel +
    (partial ? REDUCTION_REFRESH.daysTrackedSuffix(observed.useDaysLast30) : '');
  const shown = days;
  const pct = `${(shown / 30) * 100}%`;

  return (
    <div
      className="questionnaire-overlay"
      data-testid="reduction-refresh"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reduction-refresh-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={REDUCTION_REFRESH.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="reduction-refresh-title" className="flow-title">
          {REDUCTION_REFRESH.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        {step === 'days' ? (
          <div className="stack">
            <p className="body">{REDUCTION_REFRESH.lead}</p>
            <section>
              <div className="control-stack">
                <div className="slider-stage">
                  <p className="slider-readout" data-testid="refresh-use-days-readout" aria-live="polite">
                    {shown}
                  </p>
                  <p className="slider-unit">days in the last 30</p>
                </div>
                <p className="meta">{daysLabel}</p>
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
                    aria-label={daysLabel}
                    data-testid="refresh-use-days"
                    className="slider"
                    onInput={(event) => setDays(Number((event.target as HTMLInputElement).value))}
                  />
                </div>
                <div className="slider-ticks" aria-hidden="true">
                  <span>0</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                </div>
              </div>
            </section>
          </div>
        ) : (
          <div className="stack">
            <h3 className="card-title">{REDUCTION_REFRESH.durationHeading}</h3>
            <div className="choice-list">
              {PATTERN_DURATION_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={duration === option.id ? 'choice-card selected compact' : 'choice-card compact'}
                  data-duration={option.id}
                  data-testid="refresh-duration"
                  onClick={() => setDuration(option.id)}
                >
                  <span className="choice-copy">
                    <span className="choice-title">{option.title}</span>
                    <span className="meta">{option.helper}</span>
                  </span>
                </button>
              ))}
              <button
                type="button"
                className={duration === null ? 'choice-card selected compact' : 'choice-card compact'}
                data-testid="refresh-duration-unknown"
                onClick={() => setDuration(null)}
              >
                <span className="choice-copy">
                  <span className="choice-title">{REDUCTION_REFRESH.durationUnknown}</span>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
      <footer className="questionnaire-footer">
        <button type="button" className="cta-secondary" onClick={onClose}>
          {REDUCTION_REFRESH.cancel}
        </button>
        {step === 'days' ? (
          <button
            type="button"
            className="cta-primary"
            data-testid="refresh-next-1"
            onClick={() => setStep('duration')}
          >
            {REDUCTION_REFRESH.continue}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="text-back"
              data-testid="refresh-back"
              onClick={() => setStep('days')}
            >
              {REDUCTION_REFRESH.back}
            </button>
            <button
              type="button"
              className="cta-primary"
              data-testid="refresh-save"
              onClick={() => onRefresh({ thcUseDaysLast30: days, currentPatternDuration: duration })}
            >
              {REDUCTION_REFRESH.save}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}
