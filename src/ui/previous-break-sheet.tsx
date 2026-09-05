import { useEffect, useRef, useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import type { StoredPreviousBreak } from '../application/persistence/previous-break-store.ts';
import { formatIsoWithOffset, localIsoDate, resolvePickedDate } from '../application/questionnaire/date-answers.ts';
import { PREVIOUS_BREAK, HISTORY } from './copy.ts';
import { CloseIcon } from './icons.tsx';
import { ConfirmDialog } from './confirm-dialog.tsx';
import { useFocusTrap } from './focus-trap.ts';

export interface PreviousBreakDraft {
  readonly durationDays: number;
  readonly toleranceReductionScore: number | null;
  readonly endedAt: string | null;
}

export interface PreviousBreakSheetProps {
  readonly now: Instant;
  readonly initial?: StoredPreviousBreak | null;
  readonly onSave: (draft: PreviousBreakDraft, addAnother: boolean) => void;
  readonly onDelete?: () => void;
  readonly onClose: () => void;
}

export function PreviousBreakSheet({ now, initial = null, onSave, onDelete, onClose }: PreviousBreakSheetProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  useFocusTrap(true, rootRef, onClose);
  const [durationDays, setDurationDays] = useState(initial?.durationDays ?? 7);
  const [score, setScore] = useState<number | null>(initial?.toleranceReductionScore ?? null);
  const [endedAt, setEndedAt] = useState<string | null>(initial?.endedAt ?? null);
  const [endedDate, setEndedDate] = useState(initial?.endedAt ? localIsoDate(Date.parse(initial.endedAt) as Instant) : '');
  const titleId = 'previous-break-title';
  const editing = initial !== null;
  const invalidDate = endedDate !== '' && endedAt === null;

  useEffect(() => {
    setDurationDays(initial?.durationDays ?? 7);
    setScore(initial?.toleranceReductionScore ?? null);
    setEndedAt(initial?.endedAt ?? null);
    setEndedDate(initial?.endedAt ? localIsoDate(Date.parse(initial.endedAt) as Instant) : '');
  }, [initial]);

  function draft(): PreviousBreakDraft {
    return { durationDays: Math.max(1, durationDays), toleranceReductionScore: score, endedAt };
  }

  function pickEnded(isoDate: string) {
    setEndedDate(isoDate);
    setEndedAt(resolvePickedDate(isoDate, 'afternoon', now, 'any_past'));
  }

  return (
    <div className="modal-root" data-testid="previous-break-sheet" ref={rootRef}>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 id={titleId} className="card-title">
            {editing ? PREVIOUS_BREAK.editTitle : PREVIOUS_BREAK.title}
          </h2>
          <button type="button" className="icon-button" aria-label={PREVIOUS_BREAK.close} onClick={onClose} data-autofocus>
            <CloseIcon />
          </button>
        </header>
        <div className="modal-body stack">
          <section>
            <p className="micro-label" id="pb-duration-label">
              {PREVIOUS_BREAK.duration}
            </p>
            <div className="chip-row">
              {PREVIOUS_BREAK.chips.map((chip) => (
                <button
                  key={chip.days}
                  type="button"
                  className={durationDays === chip.days ? 'chip selected' : 'chip'}
                  aria-pressed={durationDays === chip.days}
                  onClick={() => setDurationDays(chip.days)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="stepper" style={{ marginTop: 12 }}>
              <button
                type="button"
                className="stepper-button"
                aria-label="Decrease duration"
                onClick={() => setDurationDays((value) => Math.max(1, value - 1))}
              >
                −
              </button>
              <output className="stepper-value" data-testid="previous-break-duration" aria-labelledby="pb-duration-label">
                {durationDays}
              </output>
              <button
                type="button"
                className="stepper-button"
                aria-label="Increase duration"
                onClick={() => setDurationDays((value) => value + 1)}
              >
                +
              </button>
            </div>
            <p className="meta">{PREVIOUS_BREAK.durationUnit}</p>
          </section>
          <section>
            <p className="micro-label" id="pb-score-label">
              {PREVIOUS_BREAK.score}
            </p>
            <div className="slider-wrap" style={{ '--slider-pct': `${((score ?? 0) / 10) * 100}%` } as Record<string, string>}>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={score ?? 0}
                aria-labelledby="pb-score-label"
                aria-valuetext={score === null ? PREVIOUS_BREAK.notSure : String(score)}
                className="slider"
                data-testid="previous-break-score"
                onInput={(event) => setScore(Number((event.target as HTMLInputElement).value))}
              />
            </div>
            <div className="symptom-anchors meta">
              <span>{PREVIOUS_BREAK.scoreZero} · 0</span>
              <span>10 · {PREVIOUS_BREAK.scoreTen}</span>
            </div>
            <button
              type="button"
              className={score === null ? 'chip selected' : 'chip'}
              aria-pressed={score === null}
              data-testid="previous-break-not-sure"
              onClick={() => setScore(null)}
            >
              {PREVIOUS_BREAK.notSure}
            </button>
          </section>
          <section>
            <p className="micro-label">{PREVIOUS_BREAK.ended}</p>
            <input
              type="date"
              className="date-input"
              max={localIsoDate(now)}
              value={endedDate}
              aria-label={PREVIOUS_BREAK.ended}
              data-testid="previous-break-ended"
              onInput={(event) => pickEnded(event.currentTarget.value)}
              onChange={(event) => pickEnded(event.currentTarget.value)}
              aria-invalid={invalidDate}
            />
            {invalidDate ? <p className="warning" role="alert">Choose today or an earlier date, or skip this field.</p> : null}
            <button
              type="button"
              className="text-back"
              data-testid="previous-break-skip-ended"
              onClick={() => {
                setEndedAt(null);
                setEndedDate('');
              }}
            >
              {PREVIOUS_BREAK.skipEnded}
            </button>
          </section>
        </div>
        <footer className="sheet-actions">
          <button type="button" className="cta-primary" data-testid="previous-break-save" disabled={invalidDate} onClick={() => onSave(draft(), false)}>
            {PREVIOUS_BREAK.save}
          </button>
          {editing ? null : (
            <button
              type="button"
              className="cta-secondary"
              data-testid="previous-break-save-another"
              disabled={invalidDate}
              onClick={() => {
                onSave(draft(), true);
                setDurationDays(7);
                setScore(null);
                setEndedAt(null);
                setEndedDate('');
              }}
            >
              {PREVIOUS_BREAK.saveAnother}
            </button>
          )}
          {onDelete !== undefined ? (
            <button
              type="button"
              className="cta-danger"
              data-testid="previous-break-delete"
              onClick={() => setConfirmingDelete(true)}
            >
              {PREVIOUS_BREAK.delete}
            </button>
          ) : null}
        </footer>
      </div>
      {confirmingDelete && onDelete !== undefined ? (
        <ConfirmDialog
          title={HISTORY.deleteConfirmTitle}
          body={HISTORY.deleteConfirmBody}
          action={HISTORY.deleteConfirmAction}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete();
          }}
          onCancel={() => setConfirmingDelete(false)}
        />
      ) : null}
    </div>
  );
}

export function createdAtIso(now: Instant): string {
  return formatIsoWithOffset(new Date(now));
}
