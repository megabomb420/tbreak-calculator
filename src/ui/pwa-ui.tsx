import { INSTALL_HINT, PWA_UPDATE } from './copy.ts';

export function UpdateSnackbar({
  onReload,
  onDismiss,
}: {
  readonly onReload: () => void;
  readonly onDismiss: () => void;
}) {
  return (
    <div className="snackbar" role="status" data-testid="pwa-update">
      <p className="snackbar-copy">{PWA_UPDATE.message}</p>
      <div className="snackbar-actions">
        <button type="button" className="text-back" onClick={onReload}>
          {PWA_UPDATE.reload}
        </button>
        <button type="button" className="text-back" onClick={onDismiss}>
          {PWA_UPDATE.dismiss}
        </button>
      </div>
    </div>
  );
}

export function InstallHint({ onDismiss }: { readonly onDismiss: () => void }) {
  return (
    <div className="snackbar" role="status" data-testid="install-hint">
      <p className="snackbar-copy">{INSTALL_HINT.message}</p>
      <button type="button" className="text-back" onClick={onDismiss}>
        {INSTALL_HINT.dismiss}
      </button>
    </div>
  );
}

export function isStandaloneDisplay(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  } catch {
    return false;
  }
}
