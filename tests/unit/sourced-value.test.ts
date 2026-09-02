import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sourcedValueInvariantError } from '../../src/domain/schemas/sourced-value.ts';

describe('SourcedValue invariant validation', () => {
  it('accepts a missing wrapper (null value, missing provenance)', () => {
    assert.equal(sourcedValueInvariantError({ value: null, provenance: 'missing' }), null);
  });

  it('accepts a user-estimated non-null value', () => {
    assert.equal(sourcedValueInvariantError({ value: 5, provenance: 'user_estimate' }), null);
  });

  it('accepts a derived value that identifies its source fields', () => {
    assert.equal(
      sourcedValueInvariantError({ value: 7, provenance: 'derived', derivedFrom: ['sessionsPerUseDay'] }),
      null,
    );
  });

  it('rejects a non-null value with missing provenance', () => {
    assert.equal(sourcedValueInvariantError({ value: 5, provenance: 'missing' }), 'value_present_with_missing_provenance');
  });

  it('rejects a null value with non-missing provenance', () => {
    assert.equal(
      sourcedValueInvariantError({ value: null, provenance: 'user_estimate' }),
      'null_value_with_non_missing_provenance',
    );
  });

  it('rejects derived provenance without source fields', () => {
    assert.equal(
      sourcedValueInvariantError({ value: 7, provenance: 'derived' }),
      'derived_provenance_without_source_fields',
    );
  });

  it('rejects source fields without derived provenance', () => {
    assert.equal(
      sourcedValueInvariantError({ value: 7, provenance: 'user_estimate', derivedFrom: ['x'] }),
      'source_fields_without_derived_provenance',
    );
  });
});
