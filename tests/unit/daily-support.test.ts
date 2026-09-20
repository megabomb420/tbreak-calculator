import assert from 'node:assert/strict';
import { test } from 'node:test';
import { presentDailySupport, type DailySupportInput } from '../../src/application/presentation/daily-support.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';

const NOW = Date.parse('2026-09-20T12:00:00Z');
const DAY = 86_400_000;
const base: DailySupportInput = { day: 4, now: NOW, anchor: NOW - 3 * DAY, checkins: [], supportAreas: [], preparation: null, targetDays: 28 };
function row(patch: Partial<DailyCheckin> = {}): DailyCheckin {
  return { recordedAt: new Date(NOW).toISOString(), craving: null, sleep: null, irritability: null, anxiety: null, appetite: null, usedThc: false, usedAt: null, note: null, ...patch };
}

test('fresh sleep and appetite difficulty outrank saved topics; scale direction is respected', () => {
  const view = presentDailySupport({ ...base, supportAreas: ['routine', 'boredom'], checkins: [row({ sleep: 1, appetite: 2, craving: 0, anxiety: 1 })] });
  assert.deepEqual(view.selections.map(item => item.area), ['sleep', 'appetite']);
  assert.match(view.selections[0]!.reason, /Sleep quality 1\/10/);
});
test('missing fields and a subsequent no-use tap do not erase rated symptoms or create zero scores', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ recordedAt: new Date(NOW - 1000).toISOString(), anxiety: 8 }), row()] });
  assert.equal(view.selections[0]!.area, 'anxiety');
  assert.equal(view.selections.filter(item => item.recordedAt !== null).length, 1);
});
test('a later rating at the same timestamp wins and a zero score is a real recorded value', () => {
  const view = presentDailySupport({ ...base, supportAreas: ['anxiety'], checkins: [row({ anxiety: 10 }), row({ anxiety: 0 })] });
  assert.ok(!view.selections.some(item => item.area === 'anxiety'));
});
test('old, future, invalid and pre-segment records never select current symptom advice', () => {
  const view = presentDailySupport({ ...base, anchor: NOW - DAY, checkins: [
    row({ recordedAt: new Date(NOW - 2 * DAY).toISOString(), sleep: 0 }),
    row({ recordedAt: new Date(NOW + 1).toISOString(), anxiety: 10 }),
    row({ recordedAt: 'invalid', craving: 10 }), row({ usedThc: true, irritability: 10 }),
  ] });
  assert.ok(view.selections.every(item => item.recordedAt === null));
  assert.equal(view.currentCheckins.length, 0);
  const stale = presentDailySupport({ ...base, checkins: [row({ recordedAt: new Date(NOW - 2 * DAY).toISOString(), sleep: 0 })] });
  assert.ok(stale.selections.every(item => item.recordedAt === null));
});
test('every preference participates across days, while current problems still take priority', () => {
  const seen = new Set<string>();
  for (let day = 1; day <= 3; day++) {
    const view = presentDailySupport({ ...base, day, supportAreas: ['sleep', 'cravings', 'anxiety'] });
    view.selections.forEach(item => seen.add(item.area));
  }
  assert.deepEqual([...seen].sort(), ['anxiety', 'cravings', 'sleep']);
});
test('comfortable ratings are not presented as symptom problems and do not imply tolerance recovery', () => {
  const view = presentDailySupport({ ...base, supportAreas: ['sleep', 'cravings'], checkins: [row({ craving: 0, sleep: 10, irritability: 0, anxiety: 0, appetite: 10 })] });
  assert.equal(view.allComfortable, true);
  assert.deepEqual(view.selections.map(item => item.area), ['routine', 'boredom']);
});
test('different days have practical tasks without changing the evidence window', () => {
  const a = presentDailySupport({ ...base, day: 3 });
  const b = presentDailySupport({ ...base, day: 4 });
  assert.equal(a.window.id, b.window.id);
  assert.notEqual(a.practice.action, b.practice.action);
  assert.match(presentDailySupport({ ...base, day: 29 }).practice.title, /Review/);
  assert.notEqual(presentDailySupport({ ...base, day: 30 }).practice.action, presentDailySupport({ ...base, day: 31 }).practice.action);
  assert.notEqual(presentDailySupport({ ...base, day: 57, targetDays: null }).practice.title, 'Prepare your usual session time');
});
test('a missing anchor cannot reuse another break’s symptoms', () => {
  const view = presentDailySupport({ ...base, anchor: null, checkins: [row({ anxiety: 10 })] });
  assert.ok(view.selections.every(item => item.recordedAt === null));
});
