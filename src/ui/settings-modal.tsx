import { useEffect, useId, useRef, useState } from 'preact/hooks';
import {
  APP_VERSION,
  SETTINGS_MENU,
  type PwaUpdateStatus,
  type SettingsMenuId,
} from '../application/settings/settings.ts';
import { SETTINGS } from './copy.ts';
import { CloseIcon } from './icons.tsx';
import { useFocusTrap } from './focus-trap.ts';

const HOLD_MS = 3000;

export interface SettingsModalProps {
  readonly open: boolean;
  readonly persistent?: boolean;
  /** PWA freshness from the single existing updater; `undefined` hides the block. */
  readonly updateStatus?: PwaUpdateStatus;
  /** Applies the available update through the same mechanism as the snackbar. */
  readonly onUpdateNow?: () => void;
  readonly onClose: () => void;
  readonly onDeleteEverything: () => void;
}

export function SettingsModal({
  open,
  persistent = true,
  updateStatus,
  onUpdateNow,
  onClose,
  onDeleteEverything,
}: SettingsModalProps) {
  const titleId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  useFocusTrap(open, rootRef, onClose);

  if (!open) return null;

  return (
    <div
      className="modal-root"
      data-testid="settings-modal"
      ref={rootRef}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose();
      }}
    >
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <header className="modal-header">
          <h2 id={titleId} className="card-title">
            {SETTINGS.title}
          </h2>
          <button
            type="button"
            className="icon-button"
            aria-label={SETTINGS.close}
            onClick={onClose}
            data-autofocus
          >
            <CloseIcon />
          </button>
        </header>
        <div className="modal-body">
          {SETTINGS_MENU.map((id) => (
            <SettingsEntry
              key={id}
              id={id}
              persistent={persistent}
              updateStatus={id === 'app-info' ? updateStatus : undefined}
              onUpdateNow={id === 'app-info' ? onUpdateNow : undefined}
              onDeleteEverything={onDeleteEverything}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsEntry({
  id,
  persistent,
  updateStatus,
  onUpdateNow,
  onDeleteEverything,
}: {
  readonly id: SettingsMenuId;
  readonly persistent: boolean;
  readonly updateStatus?: PwaUpdateStatus;
  readonly onUpdateNow?: () => void;
  readonly onDeleteEverything: () => void;
}) {
  switch (id) {
    case 'install-help':
      return (
        <section className="settings-entry" data-settings-entry="install-help">
          <h3 className="settings-entry-title">{SETTINGS.installHelpTitle}</h3>
          <ul className="settings-steps">
            <li>{SETTINGS.installIos}</li>
            <li>{SETTINGS.installAndroid}</li>
            <li>{SETTINGS.installDesktop}</li>
          </ul>
        </section>
      );
    case 'offline-note':
      return (
        <section className="settings-entry" data-settings-entry="offline-note">
          <p className="body">{SETTINGS.offlineNote}</p>
          <p className="meta">{persistent ? SETTINGS.storageOk : SETTINGS.storageUnavailable}</p>
        </section>
      );
    case 'app-info':
      return (
        <section className="settings-entry" data-settings-entry="app-info">
          <h3 className="settings-entry-title">{SETTINGS.appInfoTitle}</h3>
          <p className="body">{SETTINGS.appInfoVersion}</p>
          <p className="meta">Version {APP_VERSION}</p>
          {updateStatus !== undefined ? <UpdateStatus status={updateStatus} onUpdateNow={onUpdateNow} /> : null}
        </section>
      );
    case 'delete-everything':
      return (
        <section className="settings-entry" data-settings-entry="delete-everything">
          <h3 className="settings-entry-title">{SETTINGS.deleteTitle}</h3>
          <p className="meta" id="delete-hint">
            {SETTINGS.deleteHint}
          </p>
          <HoldToDelete onConfirm={onDeleteEverything} />
        </section>
      );
  }
}

/** Compact PWA freshness under About. The state comes from the same updater
 * that drives the snackbar; Update-now reuses its reload mechanism. */
function UpdateStatus({
  status,
  onUpdateNow,
}: {
  readonly status: PwaUpdateStatus;
  readonly onUpdateNow?: () => void;
}) {
  const line =
    status === 'current'
      ? SETTINGS.updateCurrent
      : status === 'available'
        ? SETTINGS.updateAvailable
        : status === 'offline'
          ? SETTINGS.updateOffline
          : status === 'unavailable'
            ? SETTINGS.updateUnavailable
            : SETTINGS.updateChecking;
  return (
    <div className="update-status" data-testid="settings-update-state" data-update-status={status}>
      <p className="meta" data-testid="settings-update-line">
        {line}
      </p>
      {status === 'available' && onUpdateNow !== undefined ? (
        <button type="button" className="cta-secondary update-now" data-testid="settings-update-now" onClick={onUpdateNow}>
          {SETTINGS.updateNow}
        </button>
      ) : null}
    </div>
  );
}

function HoldToDelete({ onConfirm }: { readonly onConfirm: () => void }) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stop() {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setHolding(false);
  }

  function start() {
    stop();
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setHolding(false);
      onConfirm();
    }, HOLD_MS);
  }

  useEffect(() => () => stop(), []);

  return (
    <button
      type="button"
      className={holding ? 'hold-delete holding' : 'hold-delete'}
      aria-describedby="delete-hint"
      aria-label={SETTINGS.deleteHoldLabel}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onPointerLeave={stop}
      onKeyDown={(event) => {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          if (!holding) start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === ' ' || event.key === 'Enter') stop();
      }}
    >
      <span className="hold-delete-label">{SETTINGS.deleteHoldLabel}</span>
      <span className="hold-delete-bar" aria-hidden="true" />
    </button>
  );
}
