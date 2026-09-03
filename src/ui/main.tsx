import { render } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import { registerSW } from 'virtual:pwa-register';
import type { PwaUpdateStatus } from '../application/settings/settings.ts';
import { createBrowserStorage } from '../infrastructure/storage/browser-storage.ts';
import { openDurablePersistence, type OpenDurableResult } from '../infrastructure/storage/indexeddb.ts';
import { App } from './app.tsx';
import { startViewportSync } from './viewport.ts';
import './styles.css';

startViewportSync();

const root = document.getElementById('app');
if (root === null) {
  throw new Error('application root #app is missing');
}

/**
 * How long to wait for the single service-worker registration before giving up
 * on a verifiable freshness state. Prevents "Checking for updates…" hanging in
 * contexts where no service worker exists (e.g. the dev server).
 */
const UPDATE_CHECK_TIMEOUT_MS = 5_000;

function Root() {
  const bootStorage = useMemo(() => createBrowserStorage(), []);
  const [ready, setReady] = useState<OpenDurableResult | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<PwaUpdateStatus>('checking');
  const reloadRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    let cancelled = false;
    openDurablePersistence(bootStorage.adapter, bootStorage.persistent).then((result) => {
      if (!cancelled) setReady(result);
    });
    return () => {
      cancelled = true;
    };
  }, [bootStorage]);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setUpdateStatus('unavailable');
      return;
    }
    // Do not claim the app is current or checking while offline.
    if (!navigator.onLine) setUpdateStatus('offline');

    const markAvailable = () => {
      setUpdateReady(true);
      setUpdateStatus('available');
    };

    async function verifyCurrent(registration: ServiceWorkerRegistration) {
      if (!navigator.onLine) {
        setUpdateStatus('offline');
        return;
      }
      const onUpdateFound = () => markAvailable();
      registration.addEventListener('updatefound', onUpdateFound);
      try {
        await registration.update();
        // A resolved update() with no new worker means the check genuinely
        // found nothing newer — the only state that may be called "Up to date".
        if (registration.waiting ?? registration.installing) markAvailable();
        else setUpdateStatus('current');
      } catch {
        setUpdateStatus(navigator.onLine ? 'unavailable' : 'offline');
      } finally {
        registration.removeEventListener('updatefound', onUpdateFound);
      }
    }

    const update = registerSW({
      onNeedRefresh() {
        markAvailable();
      },
      onRegistered(registration) {
        if (registration === undefined) {
          setUpdateStatus(navigator.onLine ? 'unavailable' : 'offline');
          return;
        }
        registrationRef.current = registration;
        void verifyCurrent(registration);
      },
      onRegisterError() {
        setUpdateStatus(navigator.onLine ? 'unavailable' : 'offline');
      },
    });
    reloadRef.current = update;

    const onOffline = () => setUpdateStatus('offline');
    const onOnline = () => {
      const registration = registrationRef.current;
      if (registration !== undefined && registration !== null) {
        void verifyCurrent(registration);
      }
    };
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);

    // No callback (dev server, SW blocked) -> do not claim "Up to date".
    const fallback = window.setTimeout(() => {
      setUpdateStatus((current) => (current === 'checking' && navigator.onLine ? 'unavailable' : current));
    }, UPDATE_CHECK_TIMEOUT_MS);

    return () => {
      window.clearTimeout(fallback);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (ready === null) {
    return <div className="boot-shell" data-testid="boot-shell" aria-busy="true" />;
  }

  return (
    <App
      storage={bootStorage.adapter}
      durable={ready.durable}
      persistent={ready.persistent}
      updateReady={updateReady}
      onReloadUpdate={() => {
        void reloadRef.current?.(true);
      }}
      onDismissUpdate={() => setUpdateReady(false)}
      updateStatus={updateStatus}
      onUpdateNow={() => {
        void reloadRef.current?.(true);
      }}
    />
  );
}

render(<Root />, root);
