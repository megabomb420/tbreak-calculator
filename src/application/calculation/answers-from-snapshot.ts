import type { UseProfileInput } from '../../domain/schemas/profile.ts';
import type { QuestionnaireAnswers } from '../questionnaire/engine.ts';
import type { RawAnswerSnapshot } from '../questionnaire/snapshot.ts';

/** Rebuilds questionnaire answers from a stored snapshot. Unasked fields stay absent. */
export function answersFromSnapshot(snapshot: RawAnswerSnapshot): QuestionnaireAnswers {
  if (snapshot.kind === 'detection') {
    return {
      goal: 'detection_information',
      detectionMatrix: snapshot.request.matrix,
      detectionContext: snapshot.request.context,
    };
  }
  const { profile } = snapshot;
  const answers: QuestionnaireAnswers = { goal: profile.goal };
  if (profile.goal === 'reduction') {
    return {
      ...answers,
      breakRequested: profile.breakRequested,
      ...useFields(profile),
    };
  }
  return { ...answers, ...useFields(profile) };
}

function useFields(profile: UseProfileInput): QuestionnaireAnswers {
  return {
    ...(profile.thcUseDaysLast30.value !== null ? { thcUseDaysLast30: profile.thcUseDaysLast30.value } : {}),
    ...(profile.lastUseAt.value !== null
      ? { lastUseAt: profile.lastUseAt.value }
      : profile.thcUseDaysLast30.value === 0
        ? { lastUseSkipped: true as const }
        : {}),
    ...(profile.sessionsPerUseDay.value !== null ? { sessionsPerUseDay: profile.sessionsPerUseDay.value } : {}),
    ...(profile.products.length > 0 ? { products: profile.products } : {}),
    ...(profile.routes.length > 0 ? { routes: profile.routes } : {}),
  };
}
