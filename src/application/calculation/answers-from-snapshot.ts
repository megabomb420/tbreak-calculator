import type { UseProfileInput } from '../../domain/schemas/profile.ts';
import type { QuestionnaireAnswers } from '../questionnaire/engine.ts';
import type { RawAnswerSnapshot } from '../questionnaire/snapshot.ts';

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
  const useDays = profile.thcUseDaysLast30?.value;
  const lastUse = profile.lastUseAt?.value;
  const sessions = profile.sessionsPerUseDay?.value;
  const products = Array.isArray(profile.products) ? profile.products : [];
  const routes = Array.isArray(profile.routes) ? profile.routes : [];
  return {
    ...(useDays !== null && useDays !== undefined ? { thcUseDaysLast30: useDays } : {}),
    ...(lastUse !== null && lastUse !== undefined
      ? { lastUseAt: lastUse }
      : useDays === 0
        ? { lastUseSkipped: true as const }
        : {}),
    ...(sessions !== null && sessions !== undefined ? { sessionsPerUseDay: sessions } : {}),
    ...(products.length > 0 ? { products: [...products] } : {}),
    ...(routes.length > 0 ? { routes: [...routes] } : {}),
    ...(profile.currentPatternDuration?.value
      ? { currentPatternDuration: profile.currentPatternDuration.value }
      : {}),
  };
}
