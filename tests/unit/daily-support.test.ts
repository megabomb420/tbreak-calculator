import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adviceSectionFor, presentDailySupport, SUPPORT_GUIDES, type DailySupportInput, type DailySupportView } from '../../src/application/presentation/daily-support.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';

const NOW = Date.parse('2026-09-20T12:00:00Z');
const DAY = 86_400_000;
function shown(view: DailySupportView) {
  return adviceSectionFor(view, view.defaultArea);
}

const base: DailySupportInput = { day: 4, now: NOW, anchor: NOW - 3 * DAY, checkins: [], preparation: null, targetDays: 28 };
function row(patch: Partial<DailyCheckin> = {}): DailyCheckin {
  return { recordedAt: new Date(NOW).toISOString(), craving: null, sleep: null, irritability: null, anxiety: null, appetite: null, usedThc: false, usedAt: null, note: null, ...patch };
}

test('fresh sleep and appetite difficulty drive the advice list; scale direction is respected', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ sleep: 1, appetite: 2, craving: 0, anxiety: 1 })] });
  assert.deepEqual(view.selections.map(item => item.area), ['sleep', 'appetite']);
  assert.match(view.selections[0]!.reason, /Sleep quality 1\/10/);
});
test('four hard ratings produce four advice topics instead of two, ordered by severity', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ craving: 8, sleep: 2, anxiety: 7, appetite: 1 })] });
  assert.deepEqual(view.selections.map(item => item.area), ['appetite', 'sleep', 'cravings', 'anxiety']);
  assert.ok(view.selections.every(item => item.recordedAt !== null));
  assert.match(view.selections[0]!.reason, /Appetite 1\/10 in your check-in/);
});
test('a day with no ratings keeps the day’s own practice and adds no default essays', () => {
  const view = presentDailySupport({ ...base });
  assert.deepEqual(view.selections, []);
  assert.equal(view.defaultArea, 'cravings');
  assert.equal(shown(view).reason, 'For this stage of the break');
});
test('a comfortable rating alone raises no topic and keeps the day’s practice', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ craving: 0 })] });
  assert.deepEqual(view.selections, []);
  assert.equal(view.defaultArea, 'cravings');
});
test('missing fields and a subsequent no-use tap do not erase rated symptoms or create zero scores', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ recordedAt: new Date(NOW - 1000).toISOString(), anxiety: 8 }), row()] });
  assert.equal(view.selections[0]!.area, 'anxiety');
  assert.equal(view.selections.filter(item => item.recordedAt !== null).length, 1);
});
test('a later rating at the same timestamp wins and a zero score is a real recorded value', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ anxiety: 10 }), row({ anxiety: 0 })] });
  assert.ok(!view.selections.some(item => item.area === 'anxiety'));
});
test('old, future, invalid and pre-segment records never select current symptom advice', () => {
  const view = presentDailySupport({ ...base, anchor: NOW - DAY, checkins: [
    row({ recordedAt: new Date(NOW - 2 * DAY).toISOString(), sleep: 0 }),
    row({ recordedAt: new Date(NOW + 1).toISOString(), anxiety: 10 }),
    row({ recordedAt: 'invalid', craving: 10 }), row({ usedThc: true, irritability: 10 }),
  ] });
  assert.deepEqual(view.selections, []);
  assert.equal(view.currentCheckins.length, 0);
  const stale = presentDailySupport({ ...base, checkins: [row({ recordedAt: new Date(NOW - 2 * DAY).toISOString(), sleep: 0 })] });
  assert.deepEqual(stale.selections, []);
});
test('comfortable ratings are not presented as symptom problems and do not imply tolerance recovery', () => {
  const view = presentDailySupport({ ...base, checkins: [row({ craving: 0, sleep: 10, irritability: 0, anxiety: 0, appetite: 10 })] });
  assert.equal(view.allComfortable, true);
  assert.deepEqual(view.selections, []);
  assert.equal(view.defaultArea, 'cravings');
});
test('the person’s own replacement leads the card for routine, urge and empty-time topics', () => {
  const replacement = 'walk around the block';
  // Day 4's practice is an urge topic, so the saved plan outranks the guide.
  const view = presentDailySupport({ ...base, preparation: { triggerIds: ['evening_after_work'], customTrigger: null, replacementAction: replacement, fallbackPlan: 'call a friend' } });
  assert.equal(view.defaultArea, 'cravings');
  assert.equal(shown(view).action, `Try your plan first: “${replacement}”.`);
  assert.equal(shown(view).triggerLine, 'You flagged: Evening after work.');
  assert.equal(shown(view).fallbackLine, 'If that is not possible: call a friend.');
});
test('a symptom topic keeps its guide action and drops the plan lines even when a plan exists', () => {
  const view = presentDailySupport({
    ...base,
    checkins: [row({ sleep: 1 })],
    preparation: { triggerIds: ['evening_after_work'], customTrigger: null, replacementAction: 'walk around the block', fallbackPlan: 'call a friend' },
  });
  assert.equal(view.defaultArea, 'sleep');
  // The topic keeps its own guide action rather than any practice or plan line.
  assert.equal(shown(view).action, SUPPORT_GUIDES.sleep.steps[0]);
  assert.equal(shown(view).triggerLine, null);
  assert.equal(shown(view).fallbackLine, null);
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
  assert.deepEqual(view.selections, []);
});
test('Reddit experiences stay inside the current break stage', () => {
  for (const day of [1, 4, 10, 17, 24, 40]) {
    const view = presentDailySupport({ ...base, day });
    assert.ok(view.communityTips.length >= 3, `expected several experiences on day ${day}`);
    assert.ok(
      view.communityTips.every(tip => tip.windows.includes(view.window.id)),
      `day ${day} included an experience outside ${view.window.id}`,
    );
  }
});
test('a stage-matched experience related to the current issue leads the carousel', () => {
  const view = presentDailySupport({
    ...base,
    day: 10,
    checkins: [row({ sleep: 1 })],
  });
  assert.equal(view.window.id, 'days_7_14');
  assert.ok(view.communityTip.windows.includes('days_7_14'));
  assert.ok(view.communityTip.areas.includes('sleep'));
});
