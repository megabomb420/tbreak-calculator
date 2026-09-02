// Static versioned nominal flower THC policy (CALCULATOR_SPEC section 6).
//
// Owns the unit conversions, the output label and the version line for the
// optional nominal-flower branch. The value computed is THC contained in
// plant material and MUST be labelled nominal THC, never dose, absorbed dose
// or bioavailable THC. A formula or labelling change here requires a new
// policy version and new golden fixtures.

export const NOMINAL_THC_POLICY_VERSION = 'nominal-thc-v1';

export const NOMINAL_THC_LABEL = 'nominal_thc';
export const MILLIGRAMS_PER_GRAM = 1000;
/** thcPotencyPercent is expressed as a percentage; /100 converts to a fraction. */
export const PERCENT_TO_FRACTION_DIVISOR = 100;

export interface NominalThcPolicyV1 {
  readonly id: string;
  readonly milligramsPerGram: number;
  readonly percentToFractionDivisor: number;
  readonly label: 'nominal_thc';
}

export const NOMINAL_THC_POLICY_V1: NominalThcPolicyV1 = {
  id: NOMINAL_THC_POLICY_VERSION,
  milligramsPerGram: MILLIGRAMS_PER_GRAM,
  percentToFractionDivisor: PERCENT_TO_FRACTION_DIVISOR,
  label: NOMINAL_THC_LABEL,
};
