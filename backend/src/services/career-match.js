import { reserveDailyAiRequest } from './ai-limits.js';
import { evaluateAnswers, loadActiveCareers } from './assessment.js';
import { catalogLanguage, challengePracticeDetails } from './challenge-catalog.js';
import { addEnrichment, enrichRecommendations } from './gemini.js';
import { challengeProgress } from './practical-challenges.js';
import { compareSkillsToCareers } from './skill-comparison.js';
import { buildUserContext, latestCompletedAssessment } from './user-context.js';
import { listUserSkills, skillsBody, skillsError } from './user-skills.js';

function requireAssessment(assessment) {
  if (!assessment) throw skillsError(404, 'Complete an assessment to get career recommendations');
  return assessment;
}

function localizeRecommendations(recommendations, language) {
  if (language !== 'zh-CN') return recommendations;
  const professions = recommendations.professions.map((role) => {
    const translation = role.market_pulse?.translations?.[language];
    return {
      ...role, title: translation?.title ?? role.title, summary: translation?.summary ?? role.summary,
    };
  });
  return { ...recommendations, professions };
}

function matchDetails(professions, skills, history, language) {
  return {
    skill_gaps: compareSkillsToCareers(skills, professions, language),
    skills,
    challenge_practice: {
      scope: 'practice_activity',
      history: history.map((item) => ({ ...item, ...challengePracticeDetails(item.challenge_id, language) })),
    },
  };
}

function legacySnapshot(assessment) {
  const { trait_scores, recommended_roles: professions } = assessment;
  const language = professions.some(({ reason }) => typeof reason === 'string' && /\p{Script=Han}/u.test(reason))
    ? 'zh-CN' : 'en';
  return {
    language, trait_scores,
    ...addEnrichment({ directions: [], specializations: [], professions }, { reason: 'not_saved' }, language),
  };
}

export async function getCareerMatch(database, userId) {
  const assessment = requireAssessment(await latestCompletedAssessment(database, userId));
  const skills = await listUserSkills(database, userId);
  const history = await challengeProgress(database, userId);
  const stored = assessment.career_match ?? legacySnapshot(assessment);
  const snapshot = localizeRecommendations(stored, stored.language);
  return {
    assessment_session_id: assessment.id,
    completed_at: assessment.completed_at,
    ...snapshot,
    refreshed_at: snapshot.refreshed_at ?? null,
    ...matchDetails(snapshot.professions, skills, history, snapshot.language),
  };
}

function enrichmentEvidence({ skills, skill_gaps: skillGaps, challenge_practice: practice }) {
  return {
    structured_skills: skills.slice(0, 20).map(({ name, self_assessment, practical_assessment }) => ({
      name,
      self_reported_level: self_assessment?.level ?? null,
      recorded_practical_level: practical_assessment?.level ?? null,
    })),
    prioritized_gaps: skillGaps.prioritized_gaps.slice(0, 10).map(({ key, name, status, priority, evidence, current_level, career_ids }) =>
      ({ key, name, status, priority, evidence, current_level, career_ids })),
    challenge_practice: practice.history.slice(0, 10).map(({ challenge_id, title, skill_keys, submitted_count, evaluated_count }) =>
      ({ challenge_id, title, skill_keys, submitted_count, evaluated_count })),
  };
}

export async function refreshCareerMatch(database, userId, raw) {
  const { language } = skillsBody(raw, ['language']);
  if (language !== undefined) catalogLanguage(language);
  const context = await buildUserContext(database, userId);
  const assessment = requireAssessment(context.latest_assessment);
  const skills = await listUserSkills(database, userId);
  const history = await challengeProgress(database, userId);
  const selectedLanguage = language ?? context.profile?.preferred_language ?? 'en';
  const roles = await loadActiveCareers(database);
  const evaluation = evaluateAnswers(assessment.answers, roles, selectedLanguage);
  const recommendations = localizeRecommendations(evaluation.recommendations, selectedLanguage);
  const details = matchDetails(recommendations.professions, skills, history, selectedLanguage);
  const enrichment = await enrichRecommendations({
    userId, answers: assessment.answers, traitScores: evaluation.trait_scores, recommendations,
    userContext: context, language: selectedLanguage, matchEvidence: enrichmentEvidence(details),
    beforeRequest: () => reserveDailyAiRequest(database, userId), maxAttempts: 2, waitForSlot: true,
  });
  const snapshot = {
    language: selectedLanguage,
    trait_scores: evaluation.trait_scores,
    ...addEnrichment(recommendations, enrichment, selectedLanguage),
  };
  const { rows: [saved] } = await database.query(
    `UPDATE quiz_sessions AS session
     SET career_match = $4::jsonb || jsonb_build_object('refreshed_at', clock_timestamp())
     WHERE session.user_id = $1 AND session.id = $2 AND session.career_match IS NOT DISTINCT FROM $3::jsonb
       AND session.id = (SELECT id FROM quiz_sessions WHERE user_id = $1 ORDER BY completed_at DESC, id DESC LIMIT 1)
     RETURNING career_match`,
    [userId, assessment.id, assessment.career_match && JSON.stringify(assessment.career_match), JSON.stringify(snapshot)],
  );
  if (!saved) throw skillsError(409, 'The saved assessment or career recommendations changed. Reload and retry');
  return { assessment_session_id: assessment.id, completed_at: assessment.completed_at, ...saved.career_match, ...details };
}
