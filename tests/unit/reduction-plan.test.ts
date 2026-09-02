import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createMemoryStorage } from '../../src/infrastructure/storage/storage-adapter.ts';
import { toInstant } from '../../src/domain/schemas/time.ts';
import {
  createReductionPlanStore,
  REDUCTION_PLAN_KEY,
  REDUCTION_PLAN_SCHEMA_VERSION,
} from '../../src/application/progress/reduction-plan.ts';
import { deleteAllLocalData, LOCAL_DATA_KEYS } from '../../src/application/settings/settings.ts';

describe('reduction plan store', () => {
  it('round-trips a valid plan and drops a corrupt envelope', () => {
    const adapter = createMemoryStorage();
    const store = createReductionPlanStore(adapter);
    store.save({
      schemaVersion: REDUCTION_PLAN_SCHEMA_VERSION,
      maxUseDaysPerWeek: 5,
      maxSessionsPerUseDay: 2,
      updatedAt: toInstant(1787184000000),
    });
    assert.equal(store.load()?.maxUseDaysPerWeek, 5);
    adapter.setItem(REDUCTION_PLAN_KEY, '{not-json');
    assert.equal(store.load(), null);
  });

  it('is included in delete-everything keys', () => {
    assert.ok(LOCAL_DATA_KEYS.includes(REDUCTION_PLAN_KEY));
    const adapter = createMemoryStorage();
    createReductionPlanStore(adapter).save({
      schemaVersion: REDUCTION_PLAN_SCHEMA_VERSION,
      maxUseDaysPerWeek: 4,
      maxSessionsPerUseDay: 1,
      updatedAt: toInstant(1),
    });
    adapter.setItem('other.app.key', 'keep');
    deleteAllLocalData(adapter);
    assert.equal(createReductionPlanStore(adapter).load(), null);
    assert.equal(adapter.getItem('other.app.key'), 'keep');
  });
});
