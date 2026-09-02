import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBrowserStorage,
  createWebStorageAdapter,
  probeWebStorage,
  type WebStorageLike,
} from '../../src/infrastructure/storage/browser-storage.ts';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_KEY,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
} from '../../src/application/progress/questionnaire-progress.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const AT = toInstant(1787184000000);

function createFakeWebStorage(): WebStorageLike & { readonly store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe('browser storage adapter', () => {
  it('round-trips values through a Web Storage-shaped backend', () => {
    const web = createFakeWebStorage();
    const adapter = createWebStorageAdapter(web);
    assert.equal(adapter.getItem('k'), null);
    adapter.setItem('k', 'v');
    assert.equal(adapter.getItem('k'), 'v');
    assert.equal(web.store.get('k'), 'v');
    adapter.removeItem('k');
    assert.equal(adapter.getItem('k'), null);
    adapter.setItem('a', '1');
    adapter.clear();
    assert.equal(adapter.getItem('a'), null);
  });

  it('probes storage by writing and removing a sentinel', () => {
    const web = createFakeWebStorage();
    assert.equal(probeWebStorage(web), true);
    assert.equal(web.store.size, 0);
  });

  it('treats throwing storage as unavailable', () => {
    const web: WebStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('denied');
      },
      removeItem: () => {},
      clear: () => {},
    };
    assert.equal(probeWebStorage(web), false);
  });

  it('falls back to memory when no Web Storage is available', () => {
    const { adapter, persistent } = createBrowserStorage(() => null);
    assert.equal(persistent, false);
    adapter.setItem('k', 'v');
    assert.equal(adapter.getItem('k'), 'v');
  });

  it('uses the provided Web Storage when the probe succeeds', () => {
    const web = createFakeWebStorage();
    const { adapter, persistent } = createBrowserStorage(() => web);
    assert.equal(persistent, true);
    adapter.setItem('k', 'v');
    assert.equal(web.store.get('k'), 'v');
  });

  it('falls back to memory when the probe throws', () => {
    const web: WebStorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {},
      clear: () => {},
    };
    const { adapter, persistent } = createBrowserStorage(() => web);
    assert.equal(persistent, false);
    adapter.setItem('k', 'v');
    assert.equal(adapter.getItem('k'), 'v');
  });

  it('persists a questionnaire draft through the Web Storage adapter', () => {
    const web = createFakeWebStorage();
    const store = createQuestionnaireProgressStore(createWebStorageAdapter(web));
    store.save({
      schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
      answeredSteps: 3,
      updatedAt: AT,
    });
    assert.ok(web.store.get(QUESTIONNAIRE_PROGRESS_KEY));
    assert.deepEqual(store.load(), {
      schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
      answeredSteps: 3,
      updatedAt: AT,
    });
  });

  it('self-heals a corrupt draft stored in Web Storage', () => {
    const web = createFakeWebStorage();
    web.setItem(QUESTIONNAIRE_PROGRESS_KEY, '{not-json');
    const store = createQuestionnaireProgressStore(createWebStorageAdapter(web));
    assert.equal(store.load(), null);
    assert.equal(web.store.get(QUESTIONNAIRE_PROGRESS_KEY), undefined);
  });
});
