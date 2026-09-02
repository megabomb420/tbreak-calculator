import { useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import { toInstant } from '../domain/schemas/time.ts';
import { MILLIS_PER_DAY } from '../domain/schemas/time.ts';
import type { PostBreakMode } from '../domain/schemas/enums.ts';
import { localIsoDate } from '../application/questionnaire/date-answers.ts';
import { BREAK_START, POST_BREAK_MODE_COPY, clockAlreadyRunningNote } from './break-copy.ts';
import { planForTarget } from './result-copy.ts';
import { CheckIcon, CloseIcon } from './icons.tsx';

export interface BreakStartSheetProps {
  /** Planning target from the deterministic result (preferredTargetDays). */
  readonly targetDays: number;
  /** Current abstinence day at start; > 1 shows the clock note. */
  readonly breakDayAtStart: number;
  readonly now: Instant;
  readonly onStart: (mode: PostBreakMode, startAt: Instant) => void;
  readonly onClose: () => void;
}

const FUTURE_WINDOW_DAYS = 14;

export function BreakStartSheet({ targetDays, breakDayAtStart, now, onStart, onClose }: BreakStartSheetProps) {
  const [choice, setChoice] = useState<'now' | 'date'>('now');
  const [picked, setPicked] = useState('');
  const [mode, setMode] = useState<PostBreakMode | null>(null);

  const todayIso = localIsoDate(now);
  const maxIso = localIsoDate((now + FUTURE_WINDOW_DAYS * MILLIS_PER_DAY) as Instant);

  function startAt(): Instant | null {
    if (choice === 'now') return now;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(picked)) return null;
    const parts = picked.split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
    const date = new Date(year, month - 1, day);
    return toInstant(date.getTime());
  }

  const start = startAt();

  return (
    <div
      className="questionnaire-overlay"
      data-testid="break-start-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="break-start-title"
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
                className={choice === 'now' ? 'choice-card selected' : 'choice-card'}
                data-testid="start-now"
                onClick={() => setChoice('now')}
              >
                <span className="choice-copy">
                  <span className="choice-title">{BREAK_START.startNow}</span>
                  <span className="meta">Your plan starts immediately</span>
                </span>
                <span className="choice-check">
                  <CheckIcon size={16} />
                </span>
              </button>
              <button
                type="button"
                className={choice === 'date' ? 'choice-card selected' : 'choice-card'}
                data-testid="start-pick-date"
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
                <input
                  type="date"
                  min={todayIso}
                  max={maxIso}
                  value={picked}
                  data-testid="break-start-date"
                  aria-label={BREAK_START.startPick}
                  onInput={(event) => setPicked((event.target as HTMLInputElement).value)}
                />
              </div>
            ) : null}
            {breakDayAtStart > 1 ? (
              <p className="clock-note" data-testid="clock-note">
                {clockAlreadyRunningNote(breakDayAtStart)}
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
                  className={mode === option.id ? 'choice-card selected' : 'choice-card'}
                  data-mode={option.id}
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
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button
          type="button"
          className="cta-primary"
          disabled={mode === null || start === null}
          data-testid="start-break"
          onClick={() => {
            if (mode !== null && start !== null) onStart(mode, start);
          }}
        >
          {BREAK_START.startBreak}
        </button>
      </footer>
    </div>
  );
}
