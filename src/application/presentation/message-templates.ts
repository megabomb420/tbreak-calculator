// UX_SPEC §14 message-code → copy mapping.
export const MESSAGE_TEMPLATES: Readonly<Record<string, string>> = {
  very_infrequent_use: 'You use THC only occasionally',
  regular_nondaily_use: 'You use THC regularly, but not daily',
  frequent_use: 'You use THC most days',
  near_daily_or_daily_use: 'You use THC daily or nearly daily',
  multiple_sessions_per_day: 'Multiple sessions per day',
  concentrate_product_use: 'Concentrates in the mix',
  dabbing_route_use: 'Dabbing in the mix',
  baseline_tolerance_likely_low: 'Your baseline tolerance is likely already low',
  current_pattern_under_1_month: 'This current pattern is recent — weeks rather than years',
  current_pattern_1_to_6_months: 'This current pattern has been typical for a few months',
  current_pattern_6_to_24_months: 'This current pattern has been typical for about 1–2 years',
  current_pattern_2_to_5_years: 'This current pattern has been typical for a few years',
  current_pattern_5_plus_years: 'This current pattern has been typical for many years',
  // Duration moved the planning target inside the range (tolerance-v2 product
  // heuristic). The range itself is unchanged; the target is a planning choice,
  // not a biological reset date. `pattern_duration_context_only` only appears
  // on frozen historical records produced before the v2 target rule, where the
  // stored target is the top of the range and duration was contextual only.
  preferred_target_recent_lower_end:
    'Your current pattern is recent, so the planner selects {target} days — the lower end of the same {min}–{max} day evidence range. That is a planning choice inside the range, not a predicted reset date.',
  preferred_target_established_upper_end:
    'This current pattern has been established for a while, so the planner selects {target} days — the upper end of the same {min}–{max} day evidence range. That is a planning choice inside the range, not a predicted reset date.',
  pattern_duration_context_only:
    'How long this pattern has lasted is useful context. It does not change the recommended day range.',
  broad_heuristic_individual_response_varies:
    'Limited certainty: this is a broad planning heuristic, and individual response varies.',
  history_directional_observation:
    'In your previous breaks, you reported a higher tolerance reduction at {long} days than at {short} days.',
  history_outside_population_range:
    "That observation sits outside today's broad heuristic range and does not change the calculator target.",
  history_no_additional_benefit_observed: "Across your previous breaks, longer breaks didn't report a bigger benefit.",
  history_mixed_no_directional_claim:
    "Your previous breaks point in different directions, so there's no clear personal pattern to draw on.",
  urine_frequency_chronicity_elapsed_and_cutoff_relevant:
    "For urine tests, how often and how long you've used, time since last use, and the lab's cutoff all matter.",
  urine_no_numeric_window_or_baseline_without_enabled_rules:
    "Without validated numeric rules, this app can't estimate a detection window or interpret a lab baseline.",
  blood_no_universal_clearance_window: 'Blood has no universal clearance window.',
  blood_trace_presence_not_impairment: 'A trace amount in blood is not proof of impairment.',
  blood_very_low_detectable_persists_with_sensitive_methods:
    'Very low levels can remain detectable with sensitive methods.',
  oral_fluid_shorter_scale_than_urine_cutoff_technology_dependent:
    "Saliva tests generally cover a shorter timescale than urine, but it depends heavily on the test's cutoff and technology.",
  oral_fluid_unknown_test_characteristics_prevent_numeric_estimate:
    'Unknown test details prevent any numeric estimate.',
  hair_retrospective_exposure_matrix: 'Hair testing is a historical record of exposure, not a day-by-day clock.',
  hair_never_a_day_level_clearance_date: 'There is never a "clear by" date for hair.',
  workplace_cutoff_and_policy_unknown: 'Workplace cutoffs and policies vary and are unknown to this app.',
  roadside_requires_verified_jurisdiction_rules:
    "Roadside rules depend on your jurisdiction's verified regulations, which this app does not include.",
};

export interface MessageVars {
  readonly short?: number;
  readonly long?: number;
  readonly min?: number;
  readonly max?: number;
  readonly target?: number;
}

export function renderMessageCode(code: string, vars: MessageVars = {}): string | null {
  const template = MESSAGE_TEMPLATES[code];
  if (template === undefined) return null;
  return template
    .replace('{long}', String(vars.long ?? ''))
    .replace('{short}', String(vars.short ?? ''))
    .replace('{min}', String(vars.min ?? ''))
    .replace('{max}', String(vars.max ?? ''))
    .replace('{target}', String(vars.target ?? ''));
}
