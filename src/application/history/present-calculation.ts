import type { UseProfileInput } from '../../domain/schemas/profile.ts';
import type { CalculationRecord } from '../persistence/calculation-record.ts';
import {
  buildToleranceRecoveryOutlook,
  buildToleranceRecoveryOutlookV1,
  RECOVERY_OUTLOOK_VERSION,
  type ToleranceRecoveryOutlook,
} from '../../domain/recovery/recovery-outlook.ts';
import {
  presentDetectionResult,
  presentToleranceResult,
  type ResultView,
} from '../presentation/result-presentation.ts';

const EMPTY_PROFILE: UseProfileInput = {
  goal: 'tolerance_reset',
  breakRequested: true,
  postBreakMode: null,
  thcUseDaysLast30: { value: null, provenance: 'missing' },
  sessionsPerUseDay: { value: null, provenance: 'missing' },
  products: [],
  routes: [],
  lastUseAt: { value: null, provenance: 'missing' },
  currentPatternDuration: { value: null, provenance: 'missing' },
  previousBreaks: [],
};

export function presentCalculationRecord(record: CalculationRecord): ResultView {
  if (record.result.type === 'detection') {
    return presentDetectionResult(record.result.value);
  }
  const profile = record.snapshot.kind === 'use_profile' ? record.snapshot.profile : EMPTY_PROFILE;
  return presentToleranceResult(record.result.value, profile);
}

/**
 * Recovery outlook strictly from a frozen record: the stored ToleranceResult,
 * the stored profile and the previous breaks already embedded in that frozen
 * snapshot profile. Never re-runs an engine and never merges later history,
 * so the panel reproduces what was frozen. Returns null when the record is
 * absent, is not a tolerance result, or lacks the fields the builder needs.
 */
export function recoveryOutlookFromRecord(
  record: CalculationRecord | null,
): ToleranceRecoveryOutlook | null {
  if (record === null) return null;
  if (record.result.type !== 'tolerance') return null;
  const result = record.result.value;
  if (result.kind !== 'tolerance_result') return null;
  if (record.snapshot.kind !== 'use_profile') return null;
  const build = record.recoveryOutlookVersion === RECOVERY_OUTLOOK_VERSION
    ? buildToleranceRecoveryOutlook
    : buildToleranceRecoveryOutlookV1;
  return build({
    profile: record.snapshot.profile,
    result,
    previousBreaks: record.snapshot.profile.previousBreaks,
  });
}
