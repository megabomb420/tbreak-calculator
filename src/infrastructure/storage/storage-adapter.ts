// Storage adapter port for the local-first shell (ARCHITECTURE section 3:
// infrastructure adapters).
//
// The adapter mirrors the synchronous Web Storage shape (getItem/setItem/
// removeItem/clear) so a browser `localStorage` instance can be passed
// directly once the PWA shell is wired up, and tests use the in-memory
// implementation. The v1 shell makes no network calls; everything reads and
// writes through this port.

export interface StorageAdapter {
  readonly getItem: (key: string) => string | null;
  readonly setItem: (key: string, value: string) => void;
  readonly removeItem: (key: string) => void;
  readonly clear: () => void;
}

/** In-memory storage adapter for tests and non-browser hosts. */
export function createMemoryStorage(): StorageAdapter {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
    removeItem: (key) => {
      entries.delete(key);
    },
    clear: () => {
      entries.clear();
    },
  };
}
