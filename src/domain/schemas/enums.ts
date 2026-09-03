// Shared domain enumerations (CALCULATOR_SPEC section 4.1).
// Declared as string unions with parallel runtime arrays so modules stay
// erasable-syntax-only and deterministic.

export const GOALS = ['tolerance_reset', 'reduction', 'abstinence', 'detection_information'] as const;
export type Goal = (typeof GOALS)[number];

export const POST_BREAK_MODES = ['continue_abstinence', 'occasional', 'reduced_regular_use', 'undecided'] as const;
export type PostBreakMode = (typeof POST_BREAK_MODES)[number];

export const PRODUCT_KINDS = ['flower', 'concentrate', 'vape', 'edible', 'oil', 'other'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export const ROUTES = ['smoking', 'vaping', 'dabbing', 'oral', 'sublingual', 'other'] as const;
export type Route = (typeof ROUTES)[number];

export const DETECTION_MATRICES = ['urine', 'blood', 'oral_fluid', 'hair'] as const;
export type DetectionMatrix = (typeof DETECTION_MATRICES)[number];

export const DETECTION_CONTEXTS = ['general', 'workplace', 'roadside'] as const;
export type DetectionContext = (typeof DETECTION_CONTEXTS)[number];

export const CONFIDENCE_LEVELS = ['low', 'moderate', 'high'] as const;
export type Confidence = (typeof CONFIDENCE_LEVELS)[number];

/**
 * Human ranges for how long the CURRENT use pattern has been typical.
 * Product UX bands — not scientifically validated cut-points.
 */
export const CURRENT_PATTERN_DURATION_BANDS = [
  'under_1_month',
  '1_to_6_months',
  '6_to_24_months',
  '2_to_5_years',
  '5_plus_years',
] as const;
export type CurrentPatternDurationBand = (typeof CURRENT_PATTERN_DURATION_BANDS)[number];

export const FIELD_PROVENANCES = ['missing', 'user_estimate', 'label_derived', 'laboratory_derived', 'derived'] as const;
export type FieldProvenance = (typeof FIELD_PROVENANCES)[number];

export const PRODUCT_KIND_ORDER: readonly ProductKind[] = PRODUCT_KINDS;
export const ROUTE_ORDER: readonly Route[] = ['smoking', 'vaping', 'dabbing', 'oral', 'sublingual', 'other'];
