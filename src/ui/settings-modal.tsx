import { useEffect, useId, useRef, useState } from 'preact/hooks';
import {
  APP_VERSION,
  SETTINGS_MENU,
  type PwaUpdateStatus,
  type SettingsMenuId,
} from '../application/settings/settings.ts';
import type { BackupCount, BackupError } from '../application/backup/backup.ts';
import { backupCountLines, backupErrorMessage, SETTINGS } from './copy.ts';
import { CloseIcon } from './icons.tsx';
import { ConfirmDialog } from './confirm-dialog.tsx';
import { useFocusTrap } from './focus-trap.ts';

const HOLD_MS = 3000;

/** Outcome of the last export or restore attempt, shown under "Your data". */
export type BackupStatus =
  | { readonly kind: 'exported' | 'restored'; readonly fileName: string }
  | { readonly kind: 'export_failed' }
  | { readonly kind: 'rejected'; readonly error: BackupError };

/** A parsed backup file waiting for the destructive confirmation. */
export interface PendingRestore {
  readonly fileName: string;
  readonly counts: readonly BackupCount[];
}

export interface SettingsModalProps {
  readonly open: boolean;
  readonly persistent?: boolean;
  /** A durable write this session was rejected, so saving here is not proven. */
  readonly storageWriteFailed?: boolean;
  /** PWA freshness from the single existing updater; `undefined` hides the block. */
  readonly updateStatus?: PwaUpdateStatus;
  /** Applies the available update through the same mechanism as the snackbar. */
  readonly onUpdateNow?: () => void;
  /** Opens the in-app "science behind the calculator" explainer. */
  readonly onOpenScience?: () => void;
  readonly onClose: () => void;
  readonly onDeleteEverything: () => void;
  /** Saves every stored record to a downloaded file. */
  readonly onExportData: () => void;
  /** Opens the file picker and validates the chosen backup. */
  readonly onRestoreData: () => void;
  readonly backupStatus?: BackupStatus | null;
  readonly pendingRestore?: PendingRestore | null;
  readonly onConfirmRestore: () => void;
  readonly onCancelRestore: () => void;
}

export function SettingsModal({
  open,
  persistent = true,
  storageWriteFailed = false,
  updateStatus,
  onUpdateNow,
  onOpenScience,
  onClose,
  onDeleteEverything,
  onExportData,
  onRestoreData,
  backupStatus,
  pendingRestore,
  onConfirmRestore,
  onCancelRestore,
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
              storageWriteFailed={storageWriteFailed}
              updateStatus={id === 'app-info' ? updateStatus : undefined}
              onUpdateNow={id === 'app-info' ? onUpdateNow : undefined}
              onOpenScience={id === 'app-info' ? onOpenScience : undefined}
              onDeleteEverything={onDeleteEverything}
              onExportData={onExportData}
              onRestoreData={onRestoreData}
              backupStatus={backupStatus}
              pendingRestore={pendingRestore}
              onConfirmRestore={onConfirmRestore}
              onCancelRestore={onCancelRestore}
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
  storageWriteFailed,
  updateStatus,
  onUpdateNow,
  onOpenScience,
  onDeleteEverything,
  onExportData,
  onRestoreData,
  backupStatus,
  pendingRestore,
  onConfirmRestore,
  onCancelRestore,
}: {
  readonly id: SettingsMenuId;
  readonly persistent: boolean;
  readonly storageWriteFailed: boolean;
  readonly updateStatus?: PwaUpdateStatus;
  readonly onUpdateNow?: () => void;
  readonly onOpenScience?: () => void;
  readonly onDeleteEverything: () => void;
  readonly onExportData: () => void;
  readonly onRestoreData: () => void;
  readonly backupStatus?: BackupStatus | null;
  readonly pendingRestore?: PendingRestore | null;
  readonly onConfirmRestore: () => void;
  readonly onCancelRestore: () => void;
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
          <p className="meta" data-testid="storage-status">
            {!persistent ? SETTINGS.storageUnavailable : storageWriteFailed ? SETTINGS.storageWriteFailed : SETTINGS.storageOk}
          </p>
        </section>
      );
    case 'app-info':
      return (
        <section className="settings-entry" data-settings-entry="app-info">
          <h3 className="settings-entry-title">{SETTINGS.appInfoTitle}</h3>
          <p className="body">{SETTINGS.appInfoVersion}</p>
          <p className="meta">Version {APP_VERSION}</p>
          {onOpenScience !== undefined ? (
            <button type="button" className="text-link" data-testid="settings-science" onClick={onOpenScience}>
              {SETTINGS.scienceAction}
            </button>
          ) : null}
          {updateStatus !== undefined ? <UpdateStatus status={updateStatus} onUpdateNow={onUpdateNow} /> : null}
        </section>
      );
    case 'your-data':
      return (
        <section className="settings-entry" data-settings-entry="your-data">
          <h3 className="settings-entry-title">{SETTINGS.backupTitle}</h3>
          <p className="meta">{SETTINGS.backupHint}</p>
          <div className="cta-row">
            <button type="button" className="cta-secondary" data-testid="backup-export" onClick={onExportData}>
              {SETTINGS.backupExport}
            </button>
            <button type="button" className="cta-secondary" data-testid="backup-restore" onClick={onRestoreData}>
              {SETTINGS.backupRestore}
            </button>
          </div>
          {backupStatus !== undefined && backupStatus !== null ? (
            <p className="meta" data-testid="backup-status" data-backup-status={backupStatus.kind}>
              {backupStatusText(backupStatus)}
            </p>
          ) : null}
          {pendingRestore !== undefined && pendingRestore !== null ? (
            <ConfirmDialog
              title={SETTINGS.backupConfirmTitle(pendingRestore.fileName)}
              body={SETTINGS.backupConfirmBody}
              details={backupCountLines(pendingRestore.counts)}
              action={SETTINGS.backupConfirmAction}
              actionTestId="backup-confirm"
              onConfirm={onConfirmRestore}
              onCancel={onCancelRestore}
            />
          ) : null}
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

function backupStatusText(status: BackupStatus): string {
  switch (status.kind) {
    case 'exported':
      return SETTINGS.backupExportDone(status.fileName);
    case 'restored':
      return SETTINGS.backupRestoreDone(status.fileName);
    case 'export_failed':
      return SETTINGS.backupExportFailed;
    case 'rejected':
      return backupErrorMessage(status.error);
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
