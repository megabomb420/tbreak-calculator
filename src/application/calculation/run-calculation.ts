// Coordinator: raw snapshot → validation/engines → presentation (UX_SPEC §16.3).
// Scientific values come only from existing engines.

import { explainDetection } from '../../domain/detection/detection-engine.ts';
import { DETECTION_COPY_POLICY_V1 } from '../../domain/policies/detection-copy-policy-v1.ts';
import { TOLERANCE_POLICY_V1 } from '../../domain/policies/tolerance-policy-v1.ts';
import { parseSubmittedTimestamp, type Instant } from '../../domain/schemas/time.ts';
import { calculateTolerance } from '../../domain/tolerance/tolerance-engine.ts';
import { computeWithdrawalDisplay } from '../../domain/tolerance/withdrawal.ts';
import type { RawAnswerSnapshot } from '../questionnaire/snapshot.ts';
import {
  presentDetectionResult,
  presentToleranceResult,
  type ResultView,
} from '../presentation/result-presentation.ts';

export function runCalculation(snapshot: RawAnswerSnapshot, now: Instant): ResultView {
  if (snapshot.kind === 'detection') {
    return presentDetectionResult(explainDetection(snapshot.request, DETECTION_COPY_POLICY_V1));
  }
  const result = calculateTolerance(snapshot.profile, TOLERANCE_POLICY_V1, now);
  if (result.kind === 'not_applicable' && result.withdrawal === null) {
    const lastUse = snapshot.profile.lastUseAt?.value ?? null;
    const instant = lastUse === null ? null : parseSubmittedTimestamp(lastUse);
    if (instant !== null) {
      return presentToleranceResult(
        {
          ...result,
          withdrawal: computeWithdrawalDisplay(instant, now, TOLERANCE_POLICY_V1.withdrawalAnchors),
        },
        snapshot.profile,
      );
    }
  }
  return presentToleranceResult(result, snapshot.profile);
}
