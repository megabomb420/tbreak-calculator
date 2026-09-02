import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createQuestionnaireProgressStore,
  QUESTIONNAIRE_PROGRESS_KEY,
  QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
  type QuestionnaireProgressRecord,
} from '../../src/application/progress/questionnaire-progress.ts';
import { createMemoryStorage, type StorageAdapter } from '../../src/infrastructure/storage/storage-adapter.ts';
import { deleteAllLocalData } from '../../src/application/settings/settings.ts';
import { resolveTodayState } from '../../src/application/shell/today-state.ts';
import { emptyTodayFacts } from '../../src/application/shell/today-state.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';

const AT = toInstant(1787184000000);

function record(answeredSteps = 3, updatedAt = AT): QuestionnaireProgressRecord {
  return {
    schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
    answeredSteps,
    updatedAt,
    currentStep: 'Q3',
    answers: {
      goal: 'tolerance_reset',
      thcUseDaysLast30: 10,
      lastUseAt: '2026-08-18T12:00:00Z',
    },
  };
}

describe('questionnaire progress persistence (UX_SPEC 3.2 resume)', () => {
  it('round-trips a saved draft through the memory adapter', () => {
    const store = createQuestionnaireProgressStore(createMemoryStorage());
    assert.equal(store.load(), null);
    store.save(record(3));
    assert.deepEqual(store.load(), record(3));
  });

  it('stores under the versioned key and clears on demand', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    const store = createQuestionnaireProgressStore(adapter, QUESTIONNAIRE_PROGRESS_KEY);
    store.save(record(2));
    assert.ok(adapter.getItem(QUESTIONNAIRE_PROGRESS_KEY) !== null);
    store.clear();
    assert.equal(adapter.getItem(QUESTIONNAIRE_PROGRESS_KEY), null);
    assert.equal(store.load(), null);
  });

  it('persists across store instances over the same adapter (relaunch)', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    createQuestionnaireProgressStore(adapter).save(record(4));
    const reloaded = createQuestionnaireProgressStore(adapter).load();
    assert.deepEqual(reloaded, record(4));
  });

  it('self-heals a corrupt stored draft by treating it as absent', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    adapter.setItem(QUESTIONNAIRE_PROGRESS_KEY, '{not valid json');
    const store = createQuestionnaireProgressStore(adapter);
    assert.equal(store.load(), null);
    assert.equal(adapter.getItem(QUESTIONNAIRE_PROGRESS_KEY), null);
  });

  it('rejects stored records with the wrong shape or schema version', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    for (const raw of [
      JSON.stringify({ schemaVersion: 'other-v1', answeredSteps: 3, updatedAt: AT }),
      JSON.stringify({ schemaVersion: 'questionnaire-draft-v1', answeredSteps: 3, updatedAt: AT }),
      JSON.stringify({ schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION, answeredSteps: 0, updatedAt: AT }),
      JSON.stringify({ schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION, answeredSteps: 3 }),
      JSON.stringify({ schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION, answeredSteps: 3.5, updatedAt: AT }),
      JSON.stringify({ schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION, answeredSteps: 3, updatedAt: 12.5 }),
      JSON.stringify({
        schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
        answeredSteps: 3,
        updatedAt: AT,
        currentStep: 'Q9',
        answers: { goal: 'tolerance_reset' },
      }),
      JSON.stringify('draft'),
    ]) {
      adapter.setItem(QUESTIONNAIRE_PROGRESS_KEY, raw);
      const store = createQuestionnaireProgressStore(adapter);
      assert.equal(store.load(), null, raw);
      assert.equal(adapter.getItem(QUESTIONNAIRE_PROGRESS_KEY), null, raw);
    }
  });

  it('rejects saving an invalid record (answeredSteps below 1 or non-integer)', () => {
    const store = createQuestionnaireProgressStore(createMemoryStorage());
    assert.throws(() => store.save(record(0)), RangeError);
    assert.throws(() => store.save(record(1.5)), RangeError);
  });

  it('round-trips currentStep and answers so resume can restore them', () => {
    const store = createQuestionnaireProgressStore(createMemoryStorage());
    const saved = record(2);
    store.save(saved);
    assert.deepEqual(store.load()?.currentStep, 'Q3');
    assert.equal(store.load()?.answers.goal, 'tolerance_reset');
    assert.equal(store.load()?.answers.thcUseDaysLast30, 10);
  });

  it('accepts a draft that includes the vape product kind', () => {
    const store = createQuestionnaireProgressStore(createMemoryStorage());
    store.save({
      schemaVersion: QUESTIONNAIRE_PROGRESS_SCHEMA_VERSION,
      answeredSteps: 5,
      updatedAt: AT,
      currentStep: 'Q5',
      answers: {
        goal: 'tolerance_reset',
        thcUseDaysLast30: 20,
        lastUseAt: '2026-08-18T12:00:00Z',
        sessionsPerUseDay: 1,
        products: ['vape'],
        routes: ['vaping'],
      },
    });
    const loaded = store.load();
    assert.deepEqual(loaded?.answers.products, ['vape']);
    assert.deepEqual(loaded?.answers.routes, ['vaping']);
  });
});

describe('delete everything returns to first launch (UX_SPEC 13.3)', () => {
  it('wipes drafts and stored data, so Today resolves to first-launch', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    const store = createQuestionnaireProgressStore(adapter);
    store.save(record(3));
    deleteAllLocalData(adapter);
    assert.equal(store.load(), null);
    assert.equal(resolveTodayState(emptyTodayFacts()).primary, 'first-launch');
    assert.equal(resolveTodayState(emptyTodayFacts()).resume, 'none');
  });

  it('delete everything removes only tbreak keys', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    adapter.setItem('other.app.key', 'keep-me');
    const store = createQuestionnaireProgressStore(adapter);
    store.save(record(3));
    deleteAllLocalData(adapter);
    assert.equal(store.load(), null);
    assert.equal(adapter.getItem('other.app.key'), 'keep-me');
  });
});

describe('progress store wiring into the Today router (UX_SPEC 3.2 resume)', () => {
  it('surfaces a saved draft as a secondary resume card under an active break', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    const store = createQuestionnaireProgressStore(adapter);
    store.save(record(3));
    const view = resolveTodayState({ ...emptyTodayFacts(), draft: store.load(), attempt: { status: 'active' } });
    assert.equal(view.primary, 'active-break');
    assert.equal(view.resume, 'secondary');
    assert.equal(view.primary, 'active-break'); // break stays primary
  });

  it('surfaces a saved draft as the replacing resume card when no break owns Today', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    const store = createQuestionnaireProgressStore(adapter);
    store.save(record(2));
    const view = resolveTodayState({ ...emptyTodayFacts(), draft: store.load() });
    assert.equal(view.primary, 'no-profile');
    assert.equal(view.resume, 'replaces-primary');
  });

  it('clearing the draft removes the resume card', () => {
    const adapter: StorageAdapter = createMemoryStorage();
    const store = createQuestionnaireProgressStore(adapter);
    store.save(record(3));
    store.clear();
    const view = resolveTodayState({ ...emptyTodayFacts(), hasAnyData: true, draft: store.load() });
    assert.equal(view.primary, 'no-profile');
    assert.equal(view.resume, 'none');
  });
});
