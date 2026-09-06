import { useRef, useState } from 'preact/hooks';
import {
  CHOSEN_BREAK,
  CHOSEN_BREAK_DEFAULT_DAYS,
  CHOSEN_BREAK_MAX_DAYS,
  CHOSEN_BREAK_MIN_DAYS,
} from './break-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

export interface ChooseBreakDaysProps {
  /** False when a live plan/tracking run already owns Today. */
  readonly canStart: boolean;
  readonly onStart: (days: number) => void;
  readonly onClose: () => void;
}

/** Calculator option for users who want to set their own break length
 * (3–28 days) instead of running the tolerance questionnaire. Choosing the
 * length is a scheduling decision: no calculation runs, and the confirm step
 * is deliberately worded as "Chosen duration", never as a recommendation. */
export function ChooseBreakDays({ canStart, onStart, onClose }: ChooseBreakDaysProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [days, setDays] = useState(CHOSEN_BREAK_DEFAULT_DAYS);
  const [confirmed, setConfirmed] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function change(step: -1 | 1): void {
    setDays((current) => Math.min(CHOSEN_BREAK_MAX_DAYS, Math.max(CHOSEN_BREAK_MIN_DAYS, current + step)));
  }

  return (
    <div
      className="questionnaire-overlay"
      data-testid="choose-break-days"
      role="dialog"
      aria-modal="true"
      aria-labelledby="choose-break-days-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={CHOSEN_BREAK.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="choose-break-days-title" className="flow-title">
          {CHOSEN_BREAK.flowTitle}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        {confirmed ? (
          <div className="stack chosen-break-confirm" data-testid="chosen-duration-confirm">
            <header className="result-hero">
              <p className="eyebrow">{CHOSEN_BREAK.confirmEyebrow}</p>
              <p className="chosen-break-value">
                <output data-testid="chosen-days">{days}</output>
                <span className="chosen-break-unit"> days</span>
              </p>
              <p className="meta chosen-break-kicker" data-testid="chosen-duration-label">
                {CHOSEN_BREAK.confirmKicker}
              </p>
            </header>
            <p className="body">{CHOSEN_BREAK.confirmNote}</p>
            {!canStart ? <p className="banner" data-testid="choose-running-notice">{CHOSEN_BREAK.runningPlanNotice}</p> : null}
            <button type="button" className="text-back" data-testid="choose-change-days" onClick={() => setConfirmed(false)}>
              {CHOSEN_BREAK.changeLength}
            </button>
          </div>
        ) : (
          <div className="stack">
            <header className="result-hero">
              <p className="eyebrow">{CHOSEN_BREAK.optionTitle}</p>
              <h2 className="title">{CHOSEN_BREAK.lengthQuestion}</h2>
              <p className="meta">{CHOSEN_BREAK.rangeHelper}</p>
            </header>
            <div className="break-length-picker" data-testid="break-length-picker">
              <p className="break-length-readout" aria-label={CHOSEN_BREAK.readoutLabel}>
                <output data-testid="break-length-value" aria-live="polite">
                  {days}
                </output>
                <span className="break-length-unit"> days</span>
              </p>
              <div className="break-length-stepper" role="group" aria-label={CHOSEN_BREAK.readoutLabel}>
                <button
                  type="button"
                  className="stepper-button"
                  aria-label={CHOSEN_BREAK.fewerDays}
                  data-testid="days-decrease"
                  disabled={days <= CHOSEN_BREAK_MIN_DAYS}
                  onClick={() => change(-1)}
                >
                  −
                </button>
                <button
                  type="button"
                  className="stepper-button"
                  aria-label={CHOSEN_BREAK.moreDays}
                  data-testid="days-increase"
                  disabled={days >= CHOSEN_BREAK_MAX_DAYS}
                  onClick={() => change(1)}
                >
                  +
                </button>
              </div>
              <p className="meta">{CHOSEN_BREAK.schedulingNote}</p>
            </div>
          </div>
        )}
      </div>
      {confirmed ? (
        <footer className="questionnaire-footer">
          <button
            type="button"
            className="cta-primary"
            data-testid="chosen-start-break"
            disabled={!canStart || submitted}
            onClick={() => {
              if (canStart && !submitted) {
                setSubmitted(true);
                onStart(days);
              }
            }}
          >
            {CHOSEN_BREAK.startBreak}
          </button>
        </footer>
      ) : (
        <footer className="questionnaire-footer">
          <button
            type="button"
            className="cta-primary"
            data-testid="choose-days-continue"
            onClick={() => setConfirmed(true)}
          >
            {CHOSEN_BREAK.continue}
          </button>
        </footer>
      )}
    </div>
  );
}
