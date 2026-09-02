// Browser Web Storage adapter (UX_SPEC 13, ARCHITECTURE local-first).
//
// Wraps a Web Storage object (typically `localStorage`) as a StorageAdapter.
// IndexedDB is not used for this slice: the only persisted record is the
// transient questionnaire draft, which is a single versioned JSON string.
// If Web Storage is missing or throws (private mode, disabled storage), the
// caller receives the in-memory adapter and `persistent: false`.

import { createMemoryStorage, type StorageAdapter } from './storage-adapter.ts';

/** Structural Web Storage shape. Avoids a DOM lib dependency in domain tsc. */
export interface WebStorageLike {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
  readonly clear: () => void;
}

export function createWebStorageAdapter(storage: WebStorageLike): StorageAdapter {
  return {
    getItem: (key) => storage.getItem(key),
    setItem: (key, value) => {
      storage.setItem(key, value);
    },
    removeItem: (key) => {
      storage.removeItem(key);
    },
    clear: () => {
      storage.clear();
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
