// Post-break outcome capture sheet (0.9.0).
//
// One lightweight 0-10 subjective tolerance-reduction question, offered only
// after a finite break completed and the user has actually returned to THC.
// "Save" stores the score on a linked PreviousBreak and marks the attempt
// captured; "Skip" marks it skipped. Exactly one mark per attempt, ever.

import { useRef, useState } from 'preact/hooks';
import type { StoredAttempt } from '../application/progress/break-attempt-record.ts';
import { scoreAnchors } from '../domain/recovery/outcome-capture.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

const OUTCOME_CAPTURE = {
  title: 'How much did this break reduce your tolerance?',
  helper: 'Only judge this now that you have used again.',
  scoreLabel: 'Reduction you noticed',
  save: 'Save',
  skip: 'Skip',
  close: 'Close outcome capture',
} as const;

export interface OutcomeCaptureProps {
  readonly attempt: StoredAttempt;
  readonly onSave: (attempt: StoredAttempt, score: number) => void;
  readonly onSkip: (attempt: StoredAttempt) => void;
  readonly onClose: () => void;
}

export function OutcomeCapture({ attempt, onSave, onSkip, onClose }: OutcomeCaptureProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [score, setScore] = useState(5);
  const anchors = scoreAnchors();

  return (
    <div
      className="questionnaire-overlay"
      data-testid="outcome-capture"
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-capture-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={OUTCOME_CAPTURE.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="outcome-capture-title" className="flow-title">
          {OUTCOME_CAPTURE.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        <div className="stack">
          <p className="body">{OUTCOME_CAPTURE.helper}</p>
          <section>
            <p className="micro-label" id="outcome-score-label">
              {OUTCOME_CAPTURE.scoreLabel}
            </p>
            <div
              className="slider-wrap"
              style={{ '--slider-pct': `${(score / 10) * 100}%` } as Record<string, string>}
            >
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={score}
                aria-labelledby="outcome-score-label"
                aria-valuetext={`${score} out of 10`}
                className="slider"
                data-testid="outcome-capture-score"
                onInput={(event) => setScore(Number((event.target as HTMLInputElement).value))}
              />
            </div>
            <div className="symptom-anchors meta">
              <span data-testid="outcome-anchor-zero">{anchors.zero}</span>
              <span data-testid="outcome-anchor-ten">{anchors.ten}</span>
            </div>
            <p className="meta">
              Rated {score}/10 — this is your own judgment of the break, not a reset percentage.
            </p>
          </section>
        </div>
      </div>
      <footer className="questionnaire-footer">
        <button type="button" className="cta-secondary" data-testid="outcome-capture-skip" onClick={() => onSkip(attempt)}>
          {OUTCOME_CAPTURE.skip}
        </button>
        <button type="button" className="cta-primary" data-testid="outcome-capture-save" onClick={() => onSave(attempt, score)}>
          {OUTCOME_CAPTURE.save}
        </button>
      </footer>
    </div>
  );
}
