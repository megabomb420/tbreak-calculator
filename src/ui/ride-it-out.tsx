import { useEffect, useRef } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import type { UrgeOutcome, UrgeSession } from '../application/progress/urge-session-record.ts';
import { URGE_MINUTE_CHOICES } from '../application/progress/urge-session-record.ts';
import {
  formatUrgeRemaining,
  urgeHasElapsed,
  urgeRemainingMs,
  type UrgeSummary,
} from '../domain/urges/urge-session.ts';
import { SUPPORT_GUIDES } from '../application/presentation/daily-support.ts';
import { RIDE_IT_OUT } from './urge-copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

export interface RideItOutProps {
  /** The timer that is still running, if any. */
  readonly session: UrgeSession | null;
  readonly now: Instant;
  /** The person's own replacement action, when their plan has one. */
  readonly replacement: string;
  readonly summary: UrgeSummary;
  readonly onStart: (minutes: number) => void;
  readonly onFinish: (outcome: UrgeOutcome) => void;
  readonly onStop: () => void;
  readonly onClose: () => void;
}

/** The delay lines that already exist in the craving guide, in its own words. */
const RUNNING_IDEAS = [SUPPORT_GUIDES.cravings.steps[2]!, SUPPORT_GUIDES.cravings.steps[3]!, SUPPORT_GUIDES.cravings.steps[4]!];

/**
 * The delay timer. Opened from the day's advice card: it asks how long the
 * person will wait, counts that down, and asks afterwards how the last few
 * minutes went. Closing it leaves a running timer running — the promise is the
 * point — and stopping it records nothing at all.
 */
export function RideItOut({
  session,
  now,
  replacement,
  summary,
  onStart,
  onFinish,
  onStop,
  onClose,
}: RideItOutProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const elapsed = session !== null && urgeHasElapsed(session, now);
  const done = session !== null && session.endedAt !== null && session.outcome !== null;
  const step = done ? 'done' : session === null ? 'choose' : elapsed ? 'report' : 'running';
  // Each step replaces the buttons the previous one was focused on, so focus
  // moves with the step: the marked control when the step has one, otherwise
  // the dialog itself, which announces the new state.
  useEffect(() => {
    const root = rootRef.current;
    if (root === null || root.contains(document.activeElement)) return;
    (root.querySelector<HTMLElement>('[data-autofocus]') ?? root).focus();
  }, [step]);
  return (
    <div
      className="questionnaire-overlay ride-it-out"
      data-testid="ride-it-out"
      data-step={step}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ride-it-out-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label="Close the timer" onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="ride-it-out-title" className="flow-title">{RIDE_IT_OUT.title}</h2>
      </header>
      <div className="questionnaire-body flow-body">
        {done ? (
          <section className="stack ride-done" data-testid="ride-done">
            <p className="body" data-testid="ride-done-line">{RIDE_IT_OUT.done}</p>
            <p className="meta">{RIDE_IT_OUT.doneCount(summary.total)}</p>
            <button type="button" className="cta-primary" data-testid="ride-close" data-autofocus onClick={onClose}>Done</button>
          </section>
        ) : session === null ? (
          <section className="stack">
            <header>
              <h3 className="title">{RIDE_IT_OUT.question}</h3>
              <p className="meta">{RIDE_IT_OUT.intro}</p>
            </header>
            <div className="ride-choices">
              {URGE_MINUTE_CHOICES.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className="choice-card ride-choice"
                  data-testid={`urge-minutes-${minutes}`}
                  data-autofocus={minutes === URGE_MINUTE_CHOICES[0] ? true : undefined}
                  onClick={() => onStart(minutes)}
                >
                  <span className="choice-title">{minutes} min</span>
                </button>
              ))}
            </div>
            {summary.total > 0 ? (
              <p className="meta" data-testid="ride-summary">{RIDE_IT_OUT.summary(summary.total, summary.lastSevenDays)}</p>
            ) : null}
          </section>
        ) : (
          <>
            <section className="stack ride-running">
              <div className="ride-clock">
                <p className="micro-label">{RIDE_IT_OUT.remaining}</p>
                <p className="ride-countdown" data-testid="ride-countdown" aria-hidden="true">
                  {formatUrgeRemaining(urgeRemainingMs(session, now))}
                </p>
                <p className="meta">of {session.plannedMinutes} min</p>
              </div>
              {replacement !== '' ? (
                <p className="body ride-plan" data-testid="ride-plan">
                  <strong>{RIDE_IT_OUT.planLead}</strong> {replacement}
                </p>
              ) : null}
              {elapsed ? (
                <div className="ride-report" data-testid="ride-report">
                  <p className="title" role="status">{RIDE_IT_OUT.elapsed}</p>
                  <div className="cta-row">
                    <button type="button" className="cta-primary" data-testid="ride-easier" data-autofocus onClick={() => onFinish('easier')}>
                      {RIDE_IT_OUT.easier}
                    </button>
                    <button type="button" className="cta-secondary" data-testid="ride-still-there" onClick={() => onFinish('still_there')}>
                      {RIDE_IT_OUT.stillThere}
                    </button>
                  </div>
                  <p className="meta">{RIDE_IT_OUT.outcomeNote}</p>
                </div>
              ) : (
                <>
                  <h3 className="section-subheading">{RIDE_IT_OUT.ideas}</h3>
                  <ul className="ride-ideas" data-testid="ride-ideas">
                    {RUNNING_IDEAS.map((line) => <li key={line}>{line}</li>)}
                  </ul>
                </>
              )}
            </section>
            <div className="footer-links">
              <button type="button" className="text-back" data-testid="ride-stop" onClick={onStop}>
                {RIDE_IT_OUT.stop}
              </button>
              <p className="meta">{RIDE_IT_OUT.stopNote}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
