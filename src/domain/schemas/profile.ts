// Core profile and related shared schema types (CALCULATOR_SPEC sections 4.3-4.6).
//
// Timestamps are submitted as ISO-8601 strings with an explicit timezone and
// normalised to UTC `Instant` values by validation/normalisation. A
// SourcedValue field whose value is null with provenance "missing" is the
// canonical representation of an absent ("or missing") answer.

import type { Goal, PostBreakMode, ProductKind, Route, DetectionMatrix, DetectionContext } from './enums.ts';
import type { SourcedValue } from './sourced-value.ts';
import type { Instant } from './time.ts';

export const PROFILE_SCHEMA_VERSION = 'use-profile-v1';

/** Raw, pre-normalisation profile as submitted by the questionnaire. */
export interface UseProfileInput {
  readonly goal: Goal;
  readonly breakRequested: boolean;
  readonly postBreakMode: PostBreakMode | null;
  readonly thcUseDaysLast30: SourcedValue<number>;
  readonly sessionsPerUseDay: SourcedValue<number>;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly lastUseAt: SourcedValue<string>;
  readonly previousBreaks: readonly PreviousBreakInput[];
}

/** Canonical profile after validation and normalisation. */
export interface ValidatedUseProfile {
  readonly goal: Goal;
  readonly breakRequested: boolean;
  readonly postBreakMode: PostBreakMode | null;
  readonly thcUseDaysLast30: SourcedValue<number>;
  readonly sessionsPerUseDay: SourcedValue<number>;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly lastUseAt: SourcedValue<Instant>;
  readonly previousBreaks: readonly ValidatedPreviousBreak[];
}

export interface PreviousBreakInput {
  readonly id: string;
  readonly durationDays: number;
  readonly toleranceReductionScore: number | null;
  readonly endedAt: string | null;
  readonly createdAt: string;
}

export interface ValidatedPreviousBreak {
  readonly id: string;
  readonly durationDays: number;
  readonly toleranceReductionScore: number | null;
  readonly endedAt: Instant | null;
  readonly createdAt: Instant;
}

export interface DailyCheckin {
  readonly recordedAt: string;
  readonly craving: number;
  readonly sleep: number;
  readonly irritability: number;
  readonly anxiety: number;
  readonly appetite: number;
  readonly usedThc: boolean;
  readonly usedAt: SourcedValue<string> | null;
  readonly note: string | null;
}

/** Detection request (qualitative v1; CALCULATOR_SPEC section 4.5). */
export interface DetectionRequest {
  readonly matrix: DetectionMatrix;
  readonly context: DetectionContext;
}

/** Optional nominal-flower branch inputs (CALCULATOR_SPEC section 4.6). */
export interface NominalFlowerInput {
  readonly flowerGrams: SourcedValue<number>;
  readonly thcPotencyPercent: SourcedValue<number>;
}
