import { useRef, useState } from 'preact/hooks';
import type { Instant } from '../domain/schemas/time.ts';
import { parseSubmittedTimestamp } from '../domain/schemas/time.ts';
import { DateControl } from './questionnaire-controls.tsx';
import { INTERRUPTION, RESTART_COPY_BREAK, RESTART_COPY_TRACKING, RESTART_DONE, RESTART_RECALCULATE } from './break-copy.ts';
import { CloseIcon, PauseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

export type ConfirmScope = 'attempt' | 'tracking';

export interface ConfirmUseProps {
  readonly scope: ConfirmScope;
  /** Lower bound of the valid used-at window (current segment start). */
  readonly segmentStart: Instant;
  readonly now: Instant;
  readonly onConfirm: (usedAt: Instant, usedAtIso: string) => boolean;
  readonly onClose: () => void;
  /** Explicit recalculation, never automatic (UX_SPEC 10.3.4). */
  readonly onRecalculate: () => void;
}

export function ConfirmUse({ scope, segmentStart, now, onConfirm, onClose, onRecalculate }: ConfirmUseProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onClose);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function confirmSelected() {
    if (selectedIso === null) return;
    const parsed = parseSubmittedTimestamp(selectedIso);
    if (parsed === null) return;
    if (onConfirm(parsed, selectedIso)) setConfirmed(true);
  }

  return (
    <div
      className="questionnaire-overlay"
      data-testid="confirm-use"
      data-scope={scope}
      data-phase={confirmed ? 'confirmed' : 'asking'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-use-title"
      ref={rootRef}
    >
      <header className="questionnaire-header">
        <button type="button" className="icon-button" aria-label={INTERRUPTION.close} onClick={onClose}>
          <CloseIcon />
        </button>
        <h2 id="confirm-use-title" className="flow-title">
          {INTERRUPTION.title}
        </h2>
      </header>
      <div className="questionnaire-body flow-body">
        {confirmed ? (
          <div className="stack" data-testid="restart-confirmed">
            <p className="body" data-testid="restart-copy">
              {scope === 'attempt' ? RESTART_COPY_BREAK : RESTART_COPY_TRACKING}
            </p>
          </div>
        ) : (
          <div className="stack">
            <p className="paused-note" data-testid="paused-note">
              <PauseIcon size={18} />
              {INTERRUPTION.paused}
            </p>
            <p className="meta">{INTERRUPTION.dateHelper}</p>
            <DateControl
              window="since_anchor"
              from={segmentStart}
              now={now}
              value={selectedIso ?? undefined}
              onChange={setSelectedIso}
              onInvalid={() => setSelectedIso(null)}
            />
          </div>
        )}
      </div>
      <footer className="questionnaire-footer">
        {confirmed ? (
          <>
            <button type="button" className="cta-primary" onClick={onClose}>
              {RESTART_DONE}
            </button>
            <button type="button" className="text-back" onClick={onRecalculate}>
              {RESTART_RECALCULATE}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="cta-primary"
            disabled={selectedIso === null}
            data-testid="confirm-use-submit"
            onClick={confirmSelected}
          >
            {INTERRUPTION.confirm}
          </button>
        )}
      </footer>
    </div>
  );
}
