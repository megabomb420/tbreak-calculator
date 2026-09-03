import { render } from 'preact';
import { useEffect, useMemo, useState } from 'preact/hooks';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import '@fontsource/figtree/600.css';
import '@fontsource/fraunces/500.css';
import '@fontsource/fraunces/600.css';
import { registerSW } from 'virtual:pwa-register';
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

function Root() {
  const bootStorage = useMemo(() => createBrowserStorage(), []);
  const [ready, setReady] = useState<OpenDurableResult | null>(null);
  const [updateReady, setUpdateReady] = useState(false);
  const [reload, setReload] = useState<((reloadPage?: boolean) => Promise<void>) | null>(null);

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
    const update = registerSW({
      onNeedRefresh() {
        setUpdateReady(true);
      },
    });
    setReload(() => update);
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
        void reload?.(true);
      }}
      onDismissUpdate={() => setUpdateReady(false)}
    />
  );
}

render(<Root />, root);
