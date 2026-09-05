import { useRef, useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import type { PostBreakMode } from '../domain/schemas/enums.ts';
import { planStartBounds, resolvePlanStartDate } from '../application/questionnaire/date-answers.ts';
import { BREAK_START, POST_BREAK_MODE_COPY, GUIDANCE_CHROME, clockAlreadyRunningNote } from './break-copy.ts';
import { planForTarget } from './result-copy.ts';
import { CheckIcon, CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';
import { PreparationCard } from './preparation-card.tsx';
import type { BreakPreparation } from '../application/break/preparation.ts';

export interface BreakStartSheetProps {
  /** Planning target from the deterministic result (preferredTargetDays). */
  readonly targetDays: number;
  /** Current abstinence day at start; > 1 shows the clock note. */
  readonly breakDayAtStart: number;
  readonly now: Instant;
  readonly onStart: (mode: PostBreakMode, startAt: Instant, preparation: BreakPreparation | null) => void;
  readonly onClose: () => void;
}

const FUTURE_WINDOW_DAYS = 14;

export function BreakStartSheet({ targetDays, breakDayAtStart, now, onStart, onClose }: BreakStartSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [choice, setChoice] = useState<'now' | 'date'>('now');
  const [picked, setPicked] = useState('');
  const [mode, setMode] = useState<PostBreakMode | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [preparation, setPreparation] = useState<BreakPreparation | null>(null);

  const { min: todayIso, max: maxIso } = planStartBounds(now);
  const start = choice === 'now' ? now : resolvePlanStartDate(picked, now);

  return (
    <div
      className="questionnaire-overlay"
      data-testid="break-start-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-start-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={BREAK_START.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="break-start-title" className="flow-title">
          {BREAK_START.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <section>
            <p className="meta">{planForTarget(targetDays)}</p>
            <div className="choice-list" role="group" aria-label={BREAK_START.startQuestion}>
              <button
                type="button"
                className={choice === 'now' ? 'choice-card selected compact' : 'choice-card compact'}
                data-testid="start-now"
                aria-pressed={choice === 'now'}
                onClick={() => setChoice('now')}
              >
                <span className="choice-copy">
                  <span className="choice-title">{BREAK_START.startNow}</span>
                  <span className="meta">
                    {breakDayAtStart > 1 ? BREAK_START.startNowHelperClockRunning : BREAK_START.startNowHelper}
                  </span>
                </span>
                <span className="choice-check">
                  <CheckIcon size={16} />
                </span>
              </button>
              <button
                type="button"
                className={choice === 'date' ? 'choice-card selected compact' : 'choice-card compact'}
                data-testid="start-pick-date"
                aria-pressed={choice === 'date'}
                onClick={() => setChoice('date')}
              >
                <span className="choice-copy">
                  <span className="choice-title">{BREAK_START.startPick}</span>
                  <span className="meta">Within the next {FUTURE_WINDOW_DAYS} days</span>
                </span>
                <span className="choice-check">
                  <CheckIcon size={16} />
                </span>
              </button>
            </div>
            {choice === 'date' ? (
              <div className="date-pick-wrap">
                <label className="date-field-label">
                  <span>Start date</span>
                <input
                  type="date"
                  min={todayIso}
                  max={maxIso}
                  value={picked}
                  data-testid="break-start-date"
                  aria-label={BREAK_START.startPick}
                  onInput={(event) => setPicked(event.currentTarget.value)}
                  onChange={(event) => setPicked(event.currentTarget.value)}
                  aria-invalid={picked !== '' && start === null}
                />
                </label>
                <p className="meta" aria-live="polite">{picked !== '' && start === null ? 'Choose today or a date within the next 14 days.' : 'Future breaks start at midnight on your chosen date.'}</p>
              </div>
            ) : null}
            {breakDayAtStart > 1 ? (
              <p className="clock-note" data-testid="clock-note">
                {clockAlreadyRunningNote(breakDayAtStart, targetDays)}
              </p>
            ) : null}
          </section>
          <section>
            <h3 className="card-title">{BREAK_START.modeQuestion}</h3>
            <div className="choice-list">
              {POST_BREAK_MODE_COPY.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={mode === option.id ? 'choice-card selected compact' : 'choice-card compact'}
                  data-mode={option.id}
                  aria-pressed={mode === option.id}
                  onClick={() => setMode(option.id)}
                >
                  <span className="choice-copy">
                    <span className="choice-title">{option.title}</span>
                    {option.helper ? <span className="meta">{option.helper}</span> : null}
                  </span>
                  <span className="choice-check">
                    <CheckIcon size={16} />
                  </span>
                </button>
              ))}
            </div>
            <p className="meta">{BREAK_START.helper}</p>
          </section>
          <details className="prep-disclosure" data-testid="prep-disclosure">
            <summary className="card-title">{GUIDANCE_CHROME.triggers}</summary>
            <PreparationCard value={preparation} onSave={setPreparation} allowSkip />
          </details>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="button"
          className="cta-primary"
          disabled={mode === null || start === null || submitted}
          data-testid="start-break"
          onClick={() => {
            if (mode !== null && start !== null && !submitted) {
              setSubmitted(true);
              onStart(mode, start, preparation);
            }
          }}
        >
          {BREAK_START.startBreak}
        </button>
      </footer>
    </div>
  );
}
