import { useRef } from 'preact/hooks';
import { HISTORY } from './copy.ts';
import { useFocusTrap } from './focus-trap.ts';

export interface ConfirmDialogProps {
  readonly title: string;
  readonly body: string;
  readonly action: string;
  readonly danger?: boolean;
  readonly actionTestId?: string;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
}

export function ConfirmDialog({ title, body, action, danger = true, onConfirm, onCancel, actionTestId = 'confirm-dialog-action' }: ConfirmDialogProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(true, rootRef, onCancel);
  const titleId = 'confirm-dialog-title';
  return (
    <div className="modal-root" data-testid="confirm-dialog" ref={rootRef}>
      <div className="modal-backdrop" onClick={onCancel} />
      <div className="modal-sheet confirm-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 id={titleId} className="card-title">
          {title}
        </h2>
        <p className="body">{body}</p>
        <div className="sheet-actions">
          <button
            type="button"
            className={danger ? 'cta-danger' : 'cta-primary'}
            data-testid={actionTestId}
            onClick={onConfirm}
          >
            {action}
          </button>
          <button type="button" className="cta-secondary" data-autofocus onClick={onCancel}>
            {HISTORY.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}
