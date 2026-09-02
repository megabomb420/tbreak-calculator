import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { SETTINGS_MENU, type SettingsMenuId } from '../application/settings/settings.ts';
import { SETTINGS } from './copy.ts';

const HOLD_MS = 3000;

export interface SettingsModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onDeleteEverything: () => void;
}

export function SettingsModal({ open, onClose, onDeleteEverything }: SettingsModalProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-root" data-testid="settings-modal">
      <div className="modal-backdrop" onClick={onClose} />
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header">
          <h2 id={titleId} className="card-title">
            {SETTINGS.title}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="icon-button"
            aria-label={SETTINGS.close}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        <div className="modal-body">
          {SETTINGS_MENU.map((id) => (
            <SettingsEntry key={id} id={id} onDeleteEverything={onDeleteEverything} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SettingsEntry({
  id,
  onDeleteEverything,
}: {
  readonly id: SettingsMenuId;
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

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 5l10 10M15 5L5 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
