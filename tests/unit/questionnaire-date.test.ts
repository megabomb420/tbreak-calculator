import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DATE_CHIPS,
  DAY_PART_HOURS,
  formatIsoWithOffset,
  isInstantInWindow,
  resolveDateChip,
  resolvePickedDate,
} from '../../src/application/questionnaire/date-answers.ts';
import { parseSubmittedTimestamp, THIRTY_DAY_WINDOW_MS, toInstant } from '../../src/domain/schemas/time.ts';

const NOW = toInstant(1_787_184_000_000); // 2026-08-20T00:00:00.000Z

describe('date chip mapping (UX_SPEC 4.3)', () => {
  it('emits ISO-8601 timestamps with an explicit timezone that the domain parser accepts', () => {
    const iso = formatIsoWithOffset(new Date(NOW));
    const parsed = parseSubmittedTimestamp(iso);
    assert.notEqual(parsed, null);
    assert.equal(parsed, NOW);
  });

  it('maps Today to the current instant regardless of day-part', () => {
    const iso = resolveDateChip('today', 'night', NOW, 'any_past');
    assert.equal(iso, formatIsoWithOffset(new Date(NOW)));
  });

  it('maps Yesterday + morning to 09:00 local on the previous calendar day', () => {
    const iso = resolveDateChip('yesterday', 'morning', NOW, 'any_past');
    assert.ok(iso);
    const parsed = parseSubmittedTimestamp(iso!);
    assert.ok(parsed !== null && parsed < NOW);
    const date = new Date(iso!);
    assert.equal(date.getHours(), DAY_PART_HOURS.morning);
    const today = new Date(NOW);
    const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    assert.equal(date.getFullYear(), yesterday.getFullYear());
    assert.equal(date.getMonth(), yesterday.getMonth());
    assert.equal(date.getDate(), yesterday.getDate());
  });

  it('maps 2–3 days ago to the midpoint at the chosen day-part', () => {
    const iso = resolveDateChip('days_2_3', 'evening', NOW, 'any_past');
    assert.ok(iso);
    const parsed = parseSubmittedTimestamp(iso!);
    assert.ok(parsed !== null);
    const elapsedDays = (NOW - parsed) / (24 * 3_600_000);
    assert.ok(elapsedDays > 2 && elapsedDays < 3.5);
    assert.equal(new Date(iso!).getHours(), DAY_PART_HOURS.evening);
  });

  it('hides chips that fall outside the step window', () => {
    assert.equal(resolveDateChip('today', 'morning', NOW, 'older_than_30_days'), null);
    assert.equal(resolveDateChip('yesterday', 'morning', NOW, 'older_than_30_days'), null);
    const month = resolveDateChip('about_a_month', 'morning', NOW, 'within_30_days');
    if (month !== null) {
      const parsed = parseSubmittedTimestamp(month);
      assert.ok(parsed !== null && NOW - parsed <= THIRTY_DAY_WINDOW_MS);
    }
  });

  it('uses current time when the picked date is today', () => {
    const today = formatIsoWithOffset(new Date(NOW)).slice(0, 10);
    const iso = resolvePickedDate(today, 'night', NOW, 'any_past');
    assert.equal(iso, formatIsoWithOffset(new Date(NOW)));
  });

  it('rejects a future instant in every window', () => {
    const future = toInstant(NOW + 60_000);
    assert.equal(isInstantInWindow(future, NOW, 'any_past'), false);
    assert.equal(isInstantInWindow(future, NOW, 'within_30_days'), false);
  });

  it('lists the spec chip set', () => {
    assert.deepEqual([...DATE_CHIPS], [
      'today',
      'yesterday',
      'days_2_3',
      'about_a_week',
      'about_2_weeks',
      'about_a_month',
    ]);
  });
});
