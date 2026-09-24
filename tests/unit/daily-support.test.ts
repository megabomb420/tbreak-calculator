import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adviceSectionFor, presentDailySupport, SUPPORT_GUIDES, type DailySupportInput, type DailySupportView } from '../../src/application/presentation/daily-support.ts';
import type { DailyCheckin } from '../../src/domain/schemas/profile.ts';
import type { BreakFocus } from '../../src/application/questionnaire/companion.ts';

const NOW = Date.parse('2026-09-20T12:00:00Z');
const DAY = 86_400_000;
function shown(view: DailySupportView) {
  return adviceSectionFor(view, view.defaultArea);
}

const base: DailySupportInput = { day: 4, now: NOW, anchor: NOW - 3 * DAY, checkins: [], preparation: null, targetDays: 28 };
/** The topics confirmed for a break, in taxonomy order, anchored to a day. */
function focus(areas: BreakFocus['areas'], anchorDay = 1): BreakFocus {
  return { areas, anchorDay, reusable: [] };
}
function reusable(areas: BreakFocus['areas']): BreakFocus {
  return { areas: [], anchorDay: 1, reusable: areas };
}
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
test('the topics confirmed for this break take turns, one break day at a time', () => {
  const chosen = focus(['sleep', 'boredom']);
  const days = [1, 2, 3, 4, 5].map(day => presentDailySupport({ ...base, day, focus: chosen }).defaultArea);
  // Alternating in taxonomy order, so every confirmed topic gets days and the
  // order the cards were tapped in means nothing.
  assert.deepEqual(days, ['sleep', 'boredom', 'sleep', 'boredom', 'sleep']);
  assert.deepEqual(
    [4, 5, 6].map(day => presentDailySupport({ ...base, day, focus: chosen }).areaSource),
    ['chosen', 'chosen', 'chosen'],
  );
});
test('a turn is anchored to the day the set was confirmed, not to the day count', () => {
  const anchored = focus(['sleep', 'boredom', 'nausea'], 4);
  const days = [4, 5, 6, 7, 8].map(day => presentDailySupport({ ...base, day, focus: anchored }).defaultArea);
  assert.deepEqual(days, ['sleep', 'boredom', 'nausea', 'sleep', 'boredom']);
  // A restarted break drops back to the first topic of the set that day.
  assert.equal(presentDailySupport({ ...base, day: 1, focus: anchored }).defaultArea, 'sleep');
});
test('topics kept from an earlier break steer nothing until they are confirmed', () => {
  const view = presentDailySupport({ ...base, day: 4, focus: reusable(['boredom']) });
  assert.equal(view.defaultArea, 'cravings');
  assert.equal(view.areaSource, 'suggested');
  assert.deepEqual(view.focus.reusable, ['boredom']);
});
test('a topic picked by hand leads the day on its own, even past the target', () => {
  const view = presentDailySupport({
    ...base, day: 28, targetDays: 28, pickedArea: 'nausea',
    focus: focus(['boredom']),
  });
  assert.equal(view.defaultArea, 'nausea');
  assert.equal(view.areaSource, 'picked');
  assert.equal(presentDailySupport({ ...base, pickedArea: 'not-an-area' as never }).areaSource, 'suggested');
});
test('a stored rating explains a topic without replacing the one the person chose', () => {
  const view = presentDailySupport({
    ...base, focus: focus(['boredom']), checkins: [row({ anxiety: 8 })],
  });
  assert.equal(view.defaultArea, 'boredom');
  assert.equal(view.areaSource, 'chosen');
  assert.match(view.selections[0]!.reason, /Anxiety 8\/10 in your check-in/);
  // With nothing chosen, the reading a legacy build stored still leads its day.
  const legacy = presentDailySupport({ ...base, checkins: [row({ anxiety: 8 })] });
  assert.equal(legacy.defaultArea, 'anxiety');
  assert.equal(legacy.areaSource, 'suggested');
  assert.match(adviceSectionFor(legacy, 'anxiety').reason, /Anxiety 8\/10 in your check-in/);
});
test('the target day keeps its own review ahead of the chosen topics', () => {
  const view = presentDailySupport({ ...base, day: 28, targetDays: 28, focus: focus(['boredom']) });
  assert.equal(view.defaultArea, 'routine');
  assert.equal(view.practice.title, 'Review your next step');
});
test('no chosen topics leaves the day’s own practice exactly as it was', () => {
  const withEmpty = presentDailySupport({ ...base, focus: focus([]) });
  const withoutField = presentDailySupport({ ...base });
  assert.deepEqual(withEmpty, withoutField);
  assert.equal(withEmpty.defaultArea, 'cravings');
});
test('days beyond the 28-day sequence get their own practices, not the first month again', () => {
  const practice = (day: number) => presentDailySupport({ ...base, day }).practice;
  const week = (from: number) => Array.from({ length: 7 }, (_, i) => practice(from + i).title);
  const opening = new Set(Array.from({ length: 7 }, (_, i) => practice(i + 1).title));
  const settled = week(29);
  const longer = week(57);
  // A week of each later stretch never repeats itself…
  assert.equal(new Set(settled).size, 7);
  assert.equal(new Set(longer).size, 7);
  // …and none of it is the opening week's material recycled.
  assert.equal(settled.some((title) => opening.has(title)), false);
  assert.equal(longer.some((title) => opening.has(title)), false);
  assert.deepEqual(longer.filter((title) => settled.includes(title)), []);
});

test('a break of any length still has a practice and a stage', () => {
  for (const day of [1, 28, 29, 45, 56, 57, 90, 365]) {
    const view = presentDailySupport({ ...base, day, targetDays: null });
    assert.ok(view.practice.title.length > 0, `day ${day} has a practice title`);
    assert.ok(view.practice.action.length > 20, `day ${day} has a practice action`);
    assert.ok(view.window.id.length > 0, `day ${day} has an evidence window`);
  }
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
