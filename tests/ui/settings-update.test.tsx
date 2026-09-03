import { fireEvent, render, screen, within } from '@testing-library/preact';
import { describe, expect, it, vi } from 'vitest';
import { APP_VERSION, type PwaUpdateStatus } from '../../src/application/settings/settings.ts';
import { App } from '../../src/ui/app.tsx';
import { FIRST_LAUNCH, PWA_UPDATE, SETTINGS } from '../../src/ui/copy.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { fixedClock } from '../../src/infrastructure/clock.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const AT = toInstant(1787184000000);
const clock = fixedClock(AT);

function renderApp(
  props: {
    readonly updateStatus?: PwaUpdateStatus;
    readonly onUpdateNow?: () => void;
    readonly updateReady?: boolean;
    readonly onReloadUpdate?: () => void;
    readonly onDismissUpdate?: () => void;
  } = {},
  storage: StorageAdapter = createMemoryStorage(),
) {
  return render(
    <App
      storage={storage}
      clock={clock}
      updateReady={props.updateReady ?? false}
      onReloadUpdate={props.onReloadUpdate}
      onDismissUpdate={props.onDismissUpdate}
      updateStatus={props.updateStatus}
      onUpdateNow={props.onUpdateNow}
    />,
  );
}

function openSettings() {
  fireEvent.click(screen.getByRole('button', { name: FIRST_LAUNCH.cta }));
  fireEvent.click(screen.getByTestId('open-settings'));
  expect(screen.getByTestId('settings-modal')).toBeTruthy();
}

describe('settings About: PWA update status', () => {
  it('renders “Update available” with an Update-now action when the updater found one', () => {
    const onUpdateNow = vi.fn();
    renderApp({ updateStatus: 'available', onUpdateNow });
    openSettings();
    const state = screen.getByTestId('settings-update-state');
    expect(state.getAttribute('data-update-status')).toBe('available');
    expect(within(state).getByTestId('settings-update-line').textContent).toBe(SETTINGS.updateAvailable);
    fireEvent.click(within(state).getByTestId('settings-update-now'));
    expect(onUpdateNow).toHaveBeenCalledTimes(1);
  });

  it('renders “Up to date” only for a verified-current state, with no Update-now button', () => {
    const onUpdateNow = vi.fn();
    renderApp({ updateStatus: 'current', onUpdateNow });
    openSettings();
    const state = screen.getByTestId('settings-update-state');
    expect(state.getAttribute('data-update-status')).toBe('current');
    expect(within(state).getByTestId('settings-update-line').textContent).toBe(SETTINGS.updateCurrent);
    expect(within(state).queryByTestId('settings-update-now')).toBeNull();
    expect(onUpdateNow).not.toHaveBeenCalled();
  });

  it('shows the checking state while a freshness check is in progress', () => {
    renderApp({ updateStatus: 'checking' });
    openSettings();
    const state = screen.getByTestId('settings-update-state');
    expect(state.getAttribute('data-update-status')).toBe('checking');
    expect(within(state).getByTestId('settings-update-line').textContent).toBe(SETTINGS.updateChecking);
    expect(within(state).queryByTestId('settings-update-now')).toBeNull();
  });

  it('never claims the app is current while offline', () => {
    renderApp({ updateStatus: 'offline' });
    openSettings();
    const offline = screen.getByTestId('settings-update-state');
    expect(offline.getAttribute('data-update-status')).toBe('offline');
    expect(within(offline).getByTestId('settings-update-line').textContent).toBe(SETTINGS.updateOffline);
    expect(within(offline).queryByTestId('settings-update-now')).toBeNull();
  });

  it('never claims the app is current when no service-worker context exists', () => {
    renderApp({ updateStatus: 'unavailable' });
    openSettings();
    const unavailable = screen.getByTestId('settings-update-state');
    expect(unavailable.getAttribute('data-update-status')).toBe('unavailable');
    expect(within(unavailable).getByTestId('settings-update-line').textContent).toBe(SETTINGS.updateUnavailable);
    expect(within(unavailable).queryByTestId('settings-update-now')).toBeNull();
  });

  it('hides the update block when no update state is available (bare App)', () => {
    renderApp();
    openSettings();
    expect(screen.queryByTestId('settings-update-state')).toBeNull();
  });

  it('keeps the current application version display unchanged', () => {
    renderApp({ updateStatus: 'current' });
    openSettings();
    const about = screen.getByTestId('settings-modal');
    expect(within(about).getByText(`Version ${APP_VERSION}`)).toBeTruthy();
    expect(within(about).getByText(SETTINGS.appInfoVersion)).toBeTruthy();
  });

  it('keeps the existing UpdateSnackbar working alongside the Settings state', () => {
    const onReloadUpdate = vi.fn();
    const onDismissUpdate = vi.fn();
    const storage = createMemoryStorage();
    renderApp({ updateReady: true, onReloadUpdate, onDismissUpdate, updateStatus: 'available' }, storage);
    const snackbar = screen.getByTestId('pwa-update');
    expect(snackbar.textContent ?? '').toMatch(/Update ready/);
    fireEvent.click(within(snackbar).getByRole('button', { name: PWA_UPDATE.reload }));
    expect(onReloadUpdate).toHaveBeenCalledTimes(1);
    fireEvent.click(within(snackbar).getByRole('button', { name: PWA_UPDATE.dismiss }));
    expect(onDismissUpdate).toHaveBeenCalledTimes(1);
    // Settings exposes the same available state.
    fireEvent.click(screen.getByTestId('open-settings'));
    expect(screen.getByTestId('settings-update-state').getAttribute('data-update-status')).toBe('available');
  });
});
