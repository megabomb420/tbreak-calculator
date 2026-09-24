// Tolerance-recovery outlook versions — retained for stored-record
// compatibility only.
//
// Until 0.37.x this module also built a profile-sensitive "predicted recovery
// window" (`tolerance-recovery-outlook-v2`) and a fixed-reference v1 variant,
// rendered beside the planning target on the result screen and on Today. The
// product no longer estimates a personal recovery window: the app itself
// classified the days beyond the four-week human reference as a product
// heuristic, and a large "estimated recovery window" read as a prediction the
// evidence cannot support.
//
// What remains here is the version marker new and old calculation records are
// validated against, so a saved result keeps a readable, unambiguous history.
// Nothing in this module is rendered any more; the research context on the
// result screen explains the four-week human reference instead.

export const RECOVERY_OUTLOOK_V1_VERSION = 'tolerance-recovery-outlook-v1' as const;
export const RECOVERY_OUTLOOK_VERSION = 'tolerance-recovery-outlook-v2' as const;
export type RecoveryOutlookVersion =
  | typeof RECOVERY_OUTLOOK_V1_VERSION
  | typeof RECOVERY_OUTLOOK_VERSION;

/** Four weeks: the strongest direct human CB1 biological reference used here. */
export const BIOLOGICAL_REFERENCE_DAYS = 28;

/** True when a stored calculation was created while the app still presented a
 * recovery outlook. Used only to explain an older saved result honestly. */
export function hadRecoveryOutlook(version: RecoveryOutlookVersion | undefined): boolean {
  return version === RECOVERY_OUTLOOK_V1_VERSION || version === RECOVERY_OUTLOOK_VERSION;
}
