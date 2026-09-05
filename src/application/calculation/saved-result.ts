import type { CalculationRecord } from '../persistence/calculation-record.ts';
import type { QuestionnaireSnapshotRecord } from '../progress/questionnaire-snapshot.ts';
import { QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION } from '../progress/questionnaire-snapshot.ts';
import { presentCalculationRecord } from '../history/present-calculation.ts';
import { presentToleranceResult, type ResultView } from '../presentation/result-presentation.ts';
import { parseSubmittedTimestamp, type Instant } from '../../domain/schemas/time.ts';
import { computeWithdrawalDisplay } from '../../domain/tolerance/withdrawal.ts';
import { TOLERANCE_POLICY_V3 } from '../../domain/policies/tolerance-policy-v3.ts';

/** A new detection result must never replace the use profile of a running
 * break. Prefer its linked calculation, then the latest saved use profile. */
export function savedUseProfile(
  records: readonly CalculationRecord[], snapshot: QuestionnaireSnapshotRecord | null, ownerId?: string | null,
): QuestionnaireSnapshotRecord | null {
  const owner = ownerId == null ? undefined : records.find((record) => record.id === ownerId && record.snapshot.kind === 'use_profile');
  if (owner === undefined && snapshot?.snapshot.kind === 'use_profile') return snapshot;
  const record = owner ?? records.find((record) => record.snapshot.kind === 'use_profile');
  return record === undefined ? null : {
    schemaVersion: QUESTIONNAIRE_SNAPSHOT_SCHEMA_VERSION, snapshot: record.snapshot,
    updatedAt: record.calculatedAt, runId: record.id,
  };
}

/** Advance only elapsed-time guidance. A saved use-day answer describes the
 * month of calculation; revalidating it against today's month corrupts the
 * result. Plan numbers always come from the immutable calculation. */
export function presentSavedResult(record: CalculationRecord, now: Instant): ResultView {
  if (record.result.type !== 'tolerance' || record.snapshot.kind !== 'use_profile') return presentCalculationRecord(record);
  const profile = record.snapshot.profile;
  const anchor = profile.lastUseAt.value === null ? null : parseSubmittedTimestamp(profile.lastUseAt.value);
  const withdrawal = anchor === null || anchor > now ? record.result.value.withdrawal
    : computeWithdrawalDisplay(anchor, now, TOLERANCE_POLICY_V3.withdrawalAnchors);
  return presentToleranceResult({ ...record.result.value, withdrawal }, profile);
}
