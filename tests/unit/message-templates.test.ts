import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { renderMessageCode } from '../../src/application/presentation/message-templates.ts';

describe('§14 message-code template layer', () => {
  it('maps known driver and uncertainty codes to the spec copy', () => {
    assert.equal(renderMessageCode('frequent_use'), 'You use THC most days');
    assert.equal(
      renderMessageCode('broad_heuristic_individual_response_varies'),
      'Limited certainty: this is a broad planning heuristic, and individual response varies.',
    );
    assert.equal(
      renderMessageCode('baseline_tolerance_likely_low'),
      'Your baseline tolerance is likely already low',
    );
  });

  it('fills history directional placeholders from engine observations, not invented numbers', () => {
    assert.equal(
      renderMessageCode('history_directional_observation', { short: 7, long: 21 }),
      'In your previous breaks, you reported a higher tolerance reduction at 21 days than at 7 days.',
    );
  });

  it('appends the outside-range sentence only when asked', () => {
    assert.equal(
      renderMessageCode('history_outside_population_range'),
      'That observation sits outside today\'s broad heuristic range and does not change the calculator target.',
    );
  });

  it('fills target-rationale placeholders from the immutable range and target', () => {
    assert.equal(
      renderMessageCode('preferred_target_recent_lower_end', { min: 21, max: 28, target: 21 }),
      'Because this pattern is recent, 21 days is the lower end of the 21–28-day range. It is a planning target, not a predicted reset date.',
    );
    assert.equal(
      renderMessageCode('preferred_target_established_upper_end', { min: 2, max: 7, target: 7 }),
      'Because this pattern is well established, 7 days is the upper end of the 2–7-day range. It is a planning target, not a predicted reset date.',
    );
    assert.equal(
      renderMessageCode('pattern_duration_context_only'),
      'How long this pattern has lasted is useful context. It does not change the recommended day range.',
    );
  });

  it('returns null for an unknown code instead of inventing copy', () => {
    assert.equal(renderMessageCode('not_a_real_code'), null);
    assert.equal(renderMessageCode('heuristic_frequency_intensity_v1'), null);
    assert.equal(renderMessageCode('heuristic_duration_target_within_range_v2'), null);
  });

  it('does not emit prohibited scientific claims', () => {
    const dumped = [
      'frequent_use',
      'urine_no_numeric_window_or_baseline_without_enabled_rules',
      'hair_never_a_day_level_clearance_date',
      'roadside_requires_verified_jurisdiction_rules',
    ]
      .map((code) => renderMessageCode(code))
      .join('\n');
    assert.equal(/reset complete/i.test(dumped), false);
    assert.equal(/100\s*%/.test(dumped), false);
    assert.equal(/clear by/i.test(dumped), true);
  });
});
