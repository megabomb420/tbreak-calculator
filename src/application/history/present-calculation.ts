import type { UseProfileInput } from '../../domain/schemas/profile.ts';
import type { CalculationRecord } from '../persistence/calculation-record.ts';
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
