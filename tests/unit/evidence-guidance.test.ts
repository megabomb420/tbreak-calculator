import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DETOX_METHODS_V1,
  EVIDENCE_SCALE_DISCLAIMER,
  primaryWindowIdForDay,
  windowsContainingDay,
  milestonesForDay,
  windowById,
} from '../../src/domain/guidance/evidence-guidance-v1.ts';
import { presentBreakGuidance, presentDetoxEvidence, presentPostBreakGuidance } from '../../src/application/presentation/break-guidance.ts';

describe('withdrawal window selection', () => {
  it('uses exclusive primary windows with overlapping containing windows', () => {
    assert.equal(primaryWindowIdForDay(1), 'days_1_3');
    assert.deepEqual(windowsContainingDay(1).map((w) => w.id), ['days_1_3']);

    assert.equal(primaryWindowIdForDay(2), 'days_2_6');
    assert.deepEqual(windowsContainingDay(2).map((w) => w.id), ['days_1_3', 'days_2_6']);
    assert.deepEqual(windowsContainingDay(3).map((w) => w.id), ['days_1_3', 'days_2_6']);

    assert.equal(primaryWindowIdForDay(4), 'days_2_6');
    assert.deepEqual(windowsContainingDay(6).map((w) => w.id), ['days_2_6']);

    assert.equal(primaryWindowIdForDay(7), 'days_7_14');
    assert.equal(primaryWindowIdForDay(14), 'days_7_14');
    assert.ok(windowsContainingDay(14).map((w) => w.id).includes('days_7_14'));
    assert.ok(windowsContainingDay(14).map((w) => w.id).includes('days_14_21'));

    assert.equal(primaryWindowIdForDay(15), 'days_14_21');
    assert.equal(primaryWindowIdForDay(21), 'days_21_28');
    assert.ok(windowsContainingDay(21).map((w) => w.id).includes('days_14_21'));
    assert.ok(windowsContainingDay(21).map((w) => w.id).includes('days_21_28'));

    assert.equal(primaryWindowIdForDay(28), 'days_21_28');
    assert.equal(primaryWindowIdForDay(29), 'beyond_28');
    assert.equal(primaryWindowIdForDay(90), 'beyond_28');
  });

  it('treats non-positive days as preparation, not a competing clock', () => {
    assert.equal(primaryWindowIdForDay(0), 'preparation');
    assert.deepEqual(windowsContainingDay(0), []);
    assert.equal(windowById('preparation').id, 'preparation');
  });

  it('keeps overlapping windows visible on the roadmap', () => {
    const day3 = presentBreakGuidance({
      breakDay: 3,
      targetDays: 21,
      openEnded: false,
      planned: false,
      preparation: null,
      checkins: [],
    });
    assert.equal(day3.today.windowId, 'days_2_6');
    const statuses = Object.fromEntries(day3.roadmap.map((stage) => [stage.id, stage.status]));
    assert.equal(statuses.days_1_3, 'current-overlap');
    assert.equal(statuses.days_2_6, 'current');
    assert.equal(statuses.days_7_14, 'future');
  });

  it('marks scientific windows past a short plan target without inventing extra recovery', () => {
    const view = presentBreakGuidance({
      breakDay: 5,
      targetDays: 7,
      openEnded: false,
      planned: false,
      preparation: null,
      checkins: [],
    });
    const later = view.roadmap.find((stage) => stage.id === 'days_21_28');
    assert.equal(later?.beyondPlanTarget, true);
    assert.equal(later?.status, 'future');
  });

  it('does not complete open-ended tracking at day 28', () => {
    const view = presentBreakGuidance({
      breakDay: 30,
      targetDays: null,
      openEnded: true,
      planned: false,
      preparation: null,
      checkins: [],
    });
    assert.equal(view.today.windowId, 'beyond_28');
    assert.equal(view.today.openEnded, true);
    assert.match(view.today.headline, /Maintenance/);
    assert.equal(milestonesForDay(28).length, 1);
  });
});

describe('detox evidence facts', () => {
  it('never claims a method speeds THC elimination', () => {
    for (const method of DETOX_METHODS_V1) {
      assert.equal(method.speedsThcElimination, false);
    }
  });

  it('labels the scale as app-specific rather than GRADE', () => {
    const view = presentDetoxEvidence();
    assert.match(view.scaleDisclaimer, /not formal GRADE/);
    assert.equal(view.scaleDisclaimer, EVIDENCE_SCALE_DISCLAIMER);
  });

  it('marks niacin as not recommended and does not include a dose', () => {
    const niacin = DETOX_METHODS_V1.find((method) => method.id === 'niacin');
    assert.ok(niacin);
    assert.equal(niacin?.wellbeing, 'harmful_risk');
    assert.equal(niacin?.grade, 'D');
    assert.doesNotMatch(JSON.stringify(niacin), /\d+\s*mg/i);
    assert.match(niacin?.summary ?? '', /Not recommended/i);
  });

  it('does not present hydration, exercise, sauna or fasting as proven flushes', () => {
    const ids = ['normal_hydration', 'exercise', 'sauna', 'fasting', 'water_loading'] as const;
    for (const id of ids) {
      const method = DETOX_METHODS_V1.find((row) => row.id === id);
      assert.equal(method?.speedsThcElimination, false);
    }
    assert.equal(DETOX_METHODS_V1.find((row) => row.id === 'water_loading')?.wellbeing, 'harmful_risk');
  });
});

describe('post-break guidance', () => {
  it('hides return-to-use principles for continued abstinence', () => {
    const view = presentPostBreakGuidance({ mode: 'continue_abstinence' });
    assert.equal(view.showReturnGuidance, false);
    assert.equal(view.principles.length, 0);
    assert.match(view.lead, /stay off/i);
  });

  it('shows conservative lower-exposure principles without a safe dose', () => {
    const view = presentPostBreakGuidance({
      mode: 'reduced_regular_use',
      maxUseDaysPerWeek: 2,
      maxSessionsPerUseDay: 1,
      potencyStrategy: 'lower',
      quantityStrategy: 'smaller',
    });
    assert.equal(view.showReturnGuidance, true);
    assert.ok(view.principles.some((line) => /lower-potency/i.test(line)));
    assert.match(view.noSafeDose, /does not generate a personalised safe restart dose/i);
    assert.doesNotMatch(view.principles.join(' '), /\d+\s*mg/i);
  });
});
