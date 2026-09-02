// Post-break plan summary (UX_SPEC 8 post-break presentation).
//
// Renders the user-chosen mode and limits. Return-to-use modes lead with the
// two mandated messages and the guidance chips; abstinence shows progress
// only, with no return-to-use controls.

import type { PostBreakPlan } from '../application/break/post-break-plan.ts';
import { POST_BREAK_GUIDANCE, POST_BREAK_MESSAGES, POST_BREAK_MODE_COPY, POST_BREAK_SETTINGS } from './break-copy.ts';

export function PostBreakSummary({ plan }: { readonly plan: PostBreakPlan }) {
  const option = POST_BREAK_MODE_COPY.find((entry) => entry.id === plan.mode);
  const returnMode = plan.mode !== 'continue_abstinence';
  return (
    <div className="post-break-summary" data-testid="post-break-summary" data-mode={plan.mode}>
      <p className="body">{option?.title ?? plan.mode}</p>
      {plan.mode === 'continue_abstinence' ? (
        <p className="meta">Staying off THC — no return-to-use controls.</p>
      ) : null}
      {returnMode ? (
        <>
          <p className="meta">{POST_BREAK_MESSAGES.lowerTolerance}</p>
          <p className="meta">{POST_BREAK_MESSAGES.notASafeRestartAmount}</p>
          {plan.mode === 'occasional' ? (
            <p className="meta">
              {`${POST_BREAK_SETTINGS.maxDaysWeek}: ${plan.maxUseDaysPerWeek}`}
            </p>
          ) : null}
          {plan.mode === 'reduced_regular_use' ? (
            <ul className="post-break-limit-list meta">
              <li>{`${POST_BREAK_SETTINGS.maxDaysWeek}: ${plan.maxUseDaysPerWeek}`}</li>
              <li>{`${POST_BREAK_SETTINGS.maxSessions}: ${plan.maxSessionsPerUseDay}`}</li>
              <li>{`${POST_BREAK_SETTINGS.potencyStrategy}: ${plan.potencyStrategy}`}</li>
              <li>{`${POST_BREAK_SETTINGS.quantityStrategy}: ${plan.quantityStrategy}`}</li>
            </ul>
          ) : null}
          <ul className="guidance-chips">
            {POST_BREAK_GUIDANCE.map((line) => (
              <li key={line} className="chip">
                {line}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
