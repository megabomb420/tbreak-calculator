// Core profile and related shared schema types (CALCULATOR_SPEC sections 4.3-4.6).

import type {
  CurrentPatternDurationBand,
  Goal,
  PostBreakMode,
  ProductKind,
  Route,
  DetectionMatrix,
  DetectionContext,
} from './enums.ts';
import type { SourcedValue } from './sourced-value.ts';
import type { Instant } from './time.ts';

export const PROFILE_SCHEMA_VERSION = 'use-profile-v1';

export interface UseProfileInput {
  readonly goal: Goal;
  readonly breakRequested: boolean;
  readonly postBreakMode: PostBreakMode | null;
  readonly thcUseDaysLast30: SourcedValue<number>;
  readonly sessionsPerUseDay: SourcedValue<number>;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly lastUseAt: SourcedValue<string>;
  readonly currentPatternDuration?: SourcedValue<CurrentPatternDurationBand>;
  readonly previousBreaks: readonly PreviousBreakInput[];
}

export interface ValidatedUseProfile {
  readonly goal: Goal;
  readonly breakRequested: boolean;
  readonly postBreakMode: PostBreakMode | null;
  readonly thcUseDaysLast30: SourcedValue<number>;
  readonly sessionsPerUseDay: SourcedValue<number>;
  readonly products: readonly ProductKind[];
  readonly routes: readonly Route[];
  readonly lastUseAt: SourcedValue<Instant>;
  readonly currentPatternDuration: SourcedValue<CurrentPatternDurationBand>;
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
  readonly craving: number | null;
  readonly sleep: number | null;
  readonly irritability: number | null;
  readonly anxiety: number | null;
  readonly appetite: number | null;
  readonly usedThc: boolean;
  readonly usedAt: SourcedValue<string> | null;
  readonly note: string | null;
}

export interface DetectionRequest {
  readonly matrix: DetectionMatrix;
  readonly context: DetectionContext;
}

export interface NominalFlowerInput {
  readonly flowerGrams: SourcedValue<number>;
  readonly thcPotencyPercent: SourcedValue<number>;
}
