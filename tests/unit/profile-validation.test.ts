import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateAndNormalizeProfile, type ValidationErrorCode } from '../../src/domain/validation/profile-validation.ts';
import type { UseProfileInput } from '../../src/domain/schemas/profile.ts';
import type { ProductKind, Route } from '../../src/domain/schemas/enums.ts';
import type { SourcedValue } from '../../src/domain/schemas/sourced-value.ts';
import { absent, C0, sampleProfile, userValue } from '../helpers.ts';

function codesOf(input: UseProfileInput): ValidationErrorCode[] {
  const outcome = validateAndNormalizeProfile(input, C0);
  assert.equal(outcome.ok, false);
  return outcome.errors.map((e) => e.code);
}

function expectCodes(input: UseProfileInput, expected: ValidationErrorCode[]): void {
  assert.deepEqual(codesOf(input).sort(), [...expected].sort());
}

function expectValid(input: UseProfileInput): void {
  const outcome = validateAndNormalizeProfile(input, C0);
  assert.equal(outcome.ok, true, outcome.ok ? '' : outcome.errors.map((e) => `${e.path}:${e.code}`).join(', '));
}

describe('profile validation: SourcedValue provenance', () => {
  it('rejects a null lastUseAt with non-missing provenance', () => {
    expectCodes(sampleProfile({ lastUseAt: { value: null, provenance: 'user_estimate' } }), [
      'null_value_with_non_missing_provenance',
    ]);
  });

  it('rejects a value with missing provenance', () => {
    expectCodes(sampleProfile({ thcUseDaysLast30: { value: 20, provenance: 'missing' } }), [
      'value_present_with_missing_provenance',
    ]);
  });

  it('rejects laboratory_derived provenance on a core field', () => {
    const lastUseAt = { value: '2026-08-19T22:00:00Z', provenance: 'laboratory_derived' } as SourcedValue<string>;
    expectCodes(sampleProfile({ lastUseAt }), ['invalid_provenance_for_field']);
  });

  it('rejects a malformed SourcedValue', () => {
    const thcUseDaysLast30 = '20' as unknown as SourcedValue<number>;
    expectCodes(sampleProfile({ thcUseDaysLast30 }), ['malformed_sourced_value']);
  });
});

describe('profile validation: enums and scalar ranges', () => {
  it('rejects an unknown goal', () => {
    expectCodes(sampleProfile({ goal: 'unknown_goal' as UseProfileInput['goal'] }), ['invalid_goal']);
  });

  it('rejects a non-boolean breakRequested', () => {
    expectCodes(sampleProfile({ breakRequested: 'yes' as unknown as boolean }), ['invalid_break_requested']);
  });

  it('rejects an unknown postBreakMode', () => {
    expectCodes(sampleProfile({ postBreakMode: 'sometimes' as UseProfileInput['postBreakMode'] }), [
      'invalid_post_break_mode',
    ]);
  });

  it('accepts postBreakMode = undecided for a tolerance_reset profile', () => {
    expectValid(sampleProfile({ postBreakMode: 'undecided' }));
  });

  it('rejects use days above 30, below 0 and non-integer', () => {
    expectCodes(sampleProfile({ thcUseDaysLast30: userValue(31) }), ['thc_use_days_must_be_integer_0_to_30']);
    expectCodes(sampleProfile({ thcUseDaysLast30: userValue(-1) }), ['thc_use_days_must_be_integer_0_to_30']);
    expectCodes(sampleProfile({ thcUseDaysLast30: userValue(2.5) }), ['thc_use_days_must_be_integer_0_to_30']);
  });

  it('accepts the 0 and 30 boundaries', () => {
    const zero = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    expectValid(zero);
    expectValid(sampleProfile({ thcUseDaysLast30: userValue(30) }));
  });

  it('rejects non-positive sessionsPerUseDay', () => {
    expectCodes(sampleProfile({ sessionsPerUseDay: userValue(0) }), ['sessions_must_be_positive_number']);
    expectCodes(sampleProfile({ sessionsPerUseDay: userValue(-2) }), ['sessions_must_be_positive_number']);
  });

  it('accepts fractional sessionsPerUseDay above zero (spec types it number > 0)', () => {
    expectValid(sampleProfile({ sessionsPerUseDay: userValue(1.5) }));
  });

  it('rejects unknown products and routes', () => {
    expectCodes(sampleProfile({ products: ['pill'] as unknown as ProductKind[] }), ['invalid_product']);
    expectCodes(sampleProfile({ products: ['cartridge'] as unknown as ProductKind[] }), ['invalid_product']);
    expectCodes(sampleProfile({ routes: ['injecting'] as unknown as Route[] }), ['invalid_route']);
  });

  it('accepts vape as a product kind, distinct from the vaping route', () => {
    expectValid(sampleProfile({ products: ['vape'], routes: ['vaping'] }));
  });
});

describe('profile validation: 30-day consistency, both directions (spec 5.4-5.8)', () => {
  it('rejects 0 use days with a last use inside the 30-day window', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-08-19T22:00:00Z'),
    });
    expectCodes(input, ['last_use_must_not_be_within_30_days_when_zero_use_days']);
  });

  it('rejects 0 use days with a last use exactly 30 x 24 hours old (inclusive window)', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-07-21T00:00:00Z'),
    });
    expectCodes(input, ['last_use_must_not_be_within_30_days_when_zero_use_days']);
  });

  it('accepts 0 use days when last use is older than 30 x 24 hours', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-07-20T00:00:00Z'),
    });
    expectValid(input);
  });

  it('accepts 0 use days with no last use', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    expectValid(input);
  });

  it('requires lastUseAt when use days are positive', () => {
    expectCodes(sampleProfile({ lastUseAt: absent() }), ['last_use_required_when_use_days_positive']);
  });

  it('rejects positive use days with a last use older than 30 x 24 hours', () => {
    const input = sampleProfile({ lastUseAt: userValue('2026-07-20T23:59:59Z') });
    expectCodes(input, ['last_use_must_be_within_30_days_when_use_days_positive']);
  });

  it('accepts positive use days with a last use exactly 30 x 24 hours old', () => {
    const input = sampleProfile({ lastUseAt: userValue('2026-07-21T00:00:00Z') });
    expectValid(input);
  });

  it('rejects a future lastUseAt', () => {
    expectCodes(sampleProfile({ lastUseAt: userValue('2026-08-20T01:00:00Z') }), ['last_use_in_future']);
  });

  it('requires sessions, products and routes from 4 use days upward on a range route', () => {
    for (const useDays of [4, 10, 16, 30]) {
      const input = sampleProfile({
        thcUseDaysLast30: userValue(useDays),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
      });
      expectCodes(input, ['sessions_required', 'products_required', 'routes_required']);
    }
  });

  it('rejects sessionsPerUseDay present when use days are zero', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(0),
      lastUseAt: userValue('2026-07-20T00:00:00Z'),
    });
    expectCodes(input, ['sessions_forbidden_when_zero_use_days']);
  });

  it('rejects an unparseable or naive timestamp', () => {
    expectCodes(sampleProfile({ lastUseAt: userValue('2026-08-19T22:00:00') }), ['invalid_timestamp']);
    expectCodes(sampleProfile({ lastUseAt: userValue('tomorrow') }), ['invalid_timestamp']);
  });
});

describe('profile validation: goal routing rules (spec 5.9-5.14)', () => {
  it('tolerance_reset requires breakRequested = true', () => {
    expectCodes(sampleProfile({ breakRequested: false }), ['tolerance_reset_requires_break_requested_true']);
  });

  it('abstinence requires breakRequested = false', () => {
    expectCodes(sampleProfile({ goal: 'abstinence', breakRequested: true }), [
      'abstinence_requires_break_requested_false',
    ]);
  });

  it('abstinence rejects a return-to-use postBreakMode', () => {
    const input = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      postBreakMode: 'occasional',
    });
    expectCodes(input, ['abstinence_requires_post_break_mode_continue_abstinence']);
  });

  it('abstinence accepts continue_abstinence and missing postBreakMode', () => {
    expectValid(sampleProfile({ goal: 'abstinence', breakRequested: false, postBreakMode: 'continue_abstinence' }));
    expectValid(sampleProfile({ goal: 'abstinence', breakRequested: false, postBreakMode: null }));
  });

  it('reduction accepts either breakRequested value', () => {
    expectValid(sampleProfile({ goal: 'reduction', breakRequested: true }));
    expectValid(sampleProfile({ goal: 'reduction', breakRequested: false, postBreakMode: 'undecided' }));
  });

  it('detection_information requires breakRequested = false and no postBreakMode', () => {
    const base = { goal: 'detection_information' as const, breakRequested: false, postBreakMode: null };
    const minimal = sampleProfile({
      ...base,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    expectValid(minimal);
    expectCodes(sampleProfile({ ...base, breakRequested: true }), [
      'detection_information_requires_break_requested_false',
    ]);
    expectCodes(sampleProfile({ ...base, postBreakMode: 'undecided' }), [
      'detection_information_requires_no_post_break_mode',
    ]);
  });

  it('requires use days for tolerance_reset and reduction only (UX_SPEC D2)', () => {
    for (const goal of ['tolerance_reset', 'reduction'] as const) {
      const input = sampleProfile({
        goal,
        breakRequested: true,
        thcUseDaysLast30: absent(),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
        lastUseAt: absent(),
      });
      expectCodes(input, ['thc_use_days_required']);
    }
    // Abstinence does not require use days; it requires the authoritative
    // last-use timestamp instead.
    const abstinence = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    expectCodes(abstinence, ['last_use_required_for_abstinence']);
  });
});

describe('profile validation: UX D1 - intensity fields required from 4 use days on range routes (spec 5.7)', () => {
  it('does not require sessions, products or routes at 1-3 use days on a range route', () => {
    for (const useDays of [1, 2, 3]) {
      const input = sampleProfile({
        thcUseDaysLast30: userValue(useDays),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
      });
      expectValid(input);
    }
  });

  it('requires sessions, products and routes from 4 use days upward', () => {
    for (const useDays of [4, 10, 15]) {
      const input = sampleProfile({
        thcUseDaysLast30: userValue(useDays),
        sessionsPerUseDay: absent(),
        products: [],
        routes: [],
      });
      expectCodes(input, ['sessions_required', 'products_required', 'routes_required']);
    }
  });

  it('still requires them at the top of the band (30 use days)', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(30),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
    });
    expectCodes(input, ['sessions_required', 'products_required', 'routes_required']);
  });

  it('keeps the zero-day sessions prohibition across goals', () => {
    const zero = sampleProfile({
      thcUseDaysLast30: userValue(0),
      lastUseAt: userValue('2026-07-20T00:00:00Z'),
    });
    expectCodes(zero, ['sessions_forbidden_when_zero_use_days']);
  });
});

describe('profile validation: UX D2 - abstinence requires lastUseAt, not use days', () => {
  it('accepts an abstinence profile with only the authoritative last use', () => {
    const input = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-08-19T22:00:00Z'),
    });
    expectValid(input);
  });

  it('requires lastUseAt for abstinence even when use days are absent', () => {
    const input = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    expectCodes(input, ['last_use_required_for_abstinence']);
  });

  it('applies the 30-day consistency rules to abstinence only when use days are present', () => {
    // Use days 0 present with a recent last use is contradictory.
    const zeroRecent = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-08-19T22:00:00Z'),
    });
    expectCodes(zeroRecent, ['last_use_must_not_be_within_30_days_when_zero_use_days']);

    // Use days 0 present with an older last use is fine.
    const zeroOld = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: userValue('2026-07-10T00:00:00Z'),
    });
    expectValid(zeroOld);

    // Use days 20 present with a stale last use is contradictory.
    const positiveStale = sampleProfile({
      goal: 'abstinence',
      breakRequested: false,
      thcUseDaysLast30: userValue(20),
      lastUseAt: userValue('2026-07-10T00:00:00Z'),
    });
    expectCodes(positiveStale, ['last_use_must_be_within_30_days_when_use_days_positive']);
  });
});

describe('profile validation: UX D3 - reduction without a requested break needs no lastUseAt', () => {
  it('accepts a reduction-no-break profile with use days only', () => {
    const input = sampleProfile({
      goal: 'reduction',
      breakRequested: false,
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    expectValid(input);
  });

  it('does not enforce the 30-day window against a supplied lastUseAt on that route', () => {
    const stale = sampleProfile({
      goal: 'reduction',
      breakRequested: false,
      thcUseDaysLast30: userValue(20),
      lastUseAt: userValue('2026-06-01T00:00:00Z'),
    });
    expectValid(stale);

    const recent = sampleProfile({
      goal: 'reduction',
      breakRequested: false,
      thcUseDaysLast30: userValue(20),
      lastUseAt: userValue('2026-08-19T22:00:00Z'),
    });
    expectValid(recent);
  });

  it('still rejects a future lastUseAt when one is supplied on that route', () => {
    const future = sampleProfile({
      goal: 'reduction',
      breakRequested: false,
      lastUseAt: userValue('2026-08-20T01:00:00Z'),
    });
    expectCodes(future, ['last_use_in_future']);
  });

  it('keeps the lastUseAt requirement on routes that consume it', () => {
    expectCodes(sampleProfile({ lastUseAt: absent() }), ['last_use_required_when_use_days_positive']);
    const reductionBreak = sampleProfile({
      goal: 'reduction',
      breakRequested: true,
      lastUseAt: absent(),
    });
    expectCodes(reductionBreak, ['last_use_required_when_use_days_positive']);
  });
});

describe('profile validation: previous breaks schema shape', () => {
  it('rejects invalid duration, score and timestamps', () => {
    const input = sampleProfile({
      previousBreaks: [
        {
          id: 'b1',
          durationDays: 0,
          toleranceReductionScore: 11,
          endedAt: 'not-a-timestamp',
          createdAt: 'not-a-timestamp',
        },
      ],
    });
    expectCodes(input, [
      'previous_break_duration_days_must_be_positive_integer',
      'previous_break_score_must_be_integer_0_to_10_or_null',
      'previous_break_invalid_ended_at',
      'previous_break_invalid_created_at',
    ]);
  });

  it('accepts a valid previous break including a null score and null endedAt', () => {
    const input = sampleProfile({
      previousBreaks: [
        {
          id: 'b1',
          durationDays: 14,
          toleranceReductionScore: null,
          endedAt: null,
          createdAt: '2026-01-15T10:00:00Z',
        },
      ],
    });
    expectValid(input);
  });
});

describe('profile normalisation', () => {
  it('normalises equal instants submitted in different timezones', () => {
    const utc = sampleProfile({ lastUseAt: userValue('2026-08-19T22:00:00Z') });
    const offset = sampleProfile({ lastUseAt: userValue('2026-08-20T00:00:00+02:00') });
    const a = validateAndNormalizeProfile(utc, C0);
    const b = validateAndNormalizeProfile(offset, C0);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (a.ok && b.ok) {
      assert.equal(a.profile.lastUseAt.value, b.profile.lastUseAt.value);
      assert.equal(a.profile.lastUseAt.value, 1787184000000 - 2 * 3_600_000);
    }
  });

  it('does not normalise a profile containing unknown product members', () => {
    const input = sampleProfile({
      products: ['dabbing-capable-flower', 'flower', 'concentrate', 'flower'] as unknown as ProductKind[],
      routes: ['dabbing', 'smoking', 'dabbing'] as unknown as Route[],
    });
    expectCodes(input, ['invalid_product']);
  });

  it('deduplicates valid products and routes into spec order', () => {
    const input = sampleProfile({
      products: ['concentrate', 'flower', 'flower'],
      routes: ['dabbing', 'smoking', 'dabbing'],
    });
    const outcome = validateAndNormalizeProfile(input, C0);
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.deepEqual(outcome.profile.products, ['flower', 'concentrate']);
      assert.deepEqual(outcome.profile.routes, ['smoking', 'dabbing']);
    }
  });

  it('places vape after concentrate in canonical product order', () => {
    const input = sampleProfile({
      products: ['other', 'oil', 'vape', 'edible', 'concentrate', 'flower'],
      routes: ['vaping'],
    });
    const outcome = validateAndNormalizeProfile(input, C0);
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.deepEqual(outcome.profile.products, ['flower', 'concentrate', 'vape', 'edible', 'oil', 'other']);
      assert.deepEqual(outcome.profile.routes, ['vaping']);
    }
  });

  it('forces postBreakMode = continue_abstinence for abstinence', () => {
    const input = sampleProfile({ goal: 'abstinence', breakRequested: false, postBreakMode: null });
    const outcome = validateAndNormalizeProfile(input, C0);
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.equal(outcome.profile.postBreakMode, 'continue_abstinence');
    }
  });

  it('clears postBreakMode for detection_information', () => {
    const input = sampleProfile({
      goal: 'detection_information',
      breakRequested: false,
      postBreakMode: null,
      thcUseDaysLast30: absent(),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    const outcome = validateAndNormalizeProfile(input, C0);
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.equal(outcome.profile.postBreakMode, null);
    }
  });

  it('preserves missing provenance on absent fields', () => {
    const input = sampleProfile({
      thcUseDaysLast30: userValue(0),
      sessionsPerUseDay: absent(),
      products: [],
      routes: [],
      lastUseAt: absent(),
    });
    const outcome = validateAndNormalizeProfile(input, C0);
    assert.equal(outcome.ok, true);
    if (outcome.ok) {
      assert.deepEqual(outcome.profile.sessionsPerUseDay, { value: null, provenance: 'missing' });
      assert.deepEqual(outcome.profile.lastUseAt, { value: null, provenance: 'missing' });
    }
  });

  it('is deterministic: repeated validation of identical input yields equal profiles', () => {
    const input = sampleProfile();
    const a = validateAndNormalizeProfile(input, C0);
    const b = validateAndNormalizeProfile(input, C0);
    assert.equal(a.ok, true);
    assert.equal(b.ok, true);
    if (a.ok && b.ok) {
      assert.deepEqual(a.profile, b.profile);
    }
  });

  it('returns errors sorted by path then code', () => {
    const input = sampleProfile({ sessionsPerUseDay: absent(), products: [], routes: [] });
    const outcome = validateAndNormalizeProfile(input, C0);
    assert.equal(outcome.ok, false);
    if (!outcome.ok) {
      const paths = outcome.errors.map((e) => `${e.path}:${e.code}`);
      assert.deepEqual(paths, [...paths].sort());
      for (const e of outcome.errors) {
        assert.equal(typeof e.message, 'string');
        assert.ok(e.message.length > 0);
      }
    }
  });
});
