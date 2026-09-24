// Browser Web Storage adapter (UX_SPEC 13, ARCHITECTURE local-first).
//
// Wraps a Web Storage object (typically `localStorage`) as a StorageAdapter.
// When IndexedDB is unavailable it also backs the durable records, so a
// refused write to a durable key is passed on as a rejected save; the
// transient questionnaire draft and result-view keys stay best-effort.
// If Web Storage is missing or throws (private mode, disabled storage), the
// caller receives the in-memory adapter and `persistent: false`.

import { createMemoryStorage, type StorageAdapter } from './storage-adapter.ts';
import { MIGRATED_WEB_STORAGE_KEYS } from '../../application/persistence/durable.ts';

/** Structural Web Storage shape. Avoids a DOM lib dependency in domain tsc. */
export interface WebStorageLike {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
  readonly clear: () => void;
}

/** Keys the durable facade writes when Web Storage backs durable records.
 * A refused write to one of these is a save the app must not claim: the throw
 * travels to the facade, which flags `writeFailed` and tells the shell. The
 * remaining owned keys (draft, result view, companion, install hint, migration
 * marker) are transient, so they stay best-effort. */
const DURABLE_OWNED_KEYS: Record<string, true> = Object.fromEntries(
  MIGRATED_WEB_STORAGE_KEYS.map((key): [string, true] => [key, true]),
);

export function createWebStorageAdapter(storage: WebStorageLike): StorageAdapter {
  return {
    getItem: (key) => {
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setItem: (key, value) => {
      if (DURABLE_OWNED_KEYS[key] === true) {
        storage.setItem(key, value);
        return;
      }
      try {
        storage.setItem(key, value);
      } catch {
        // Quota / disabled storage after a successful probe must not crash
        // the shell while it holds transient state only.
      }
    },
    removeItem: (key) => {
      try {
        storage.removeItem(key);
      } catch {
        // ignore
      }
    },
    clear: () => {
      try {
        storage.clear();
      } catch {
        // ignore
      }
    },
  };
}

/** True when `storage` accepts a write/remove probe. */
export function probeWebStorage(storage: WebStorageLike): boolean {
  const probe = '__tbreak.storage-probe__';
  try {
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

export interface BrowserStorageResult {
  readonly adapter: StorageAdapter;
  readonly persistent: boolean;
}

function readLocalStorage(): WebStorageLike | null {
  try {
    const storage = (globalThis as { localStorage?: WebStorageLike }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

/** Browser host adapter: `localStorage` when it works, otherwise memory. */
export function createBrowserStorage(
  getStorage: () => WebStorageLike | null = readLocalStorage,
): BrowserStorageResult {
  const storage = getStorage();
  if (storage !== null && probeWebStorage(storage)) {
    return { adapter: createWebStorageAdapter(storage), persistent: true };
  }
  return { adapter: createMemoryStorage(), persistent: false };
}
