import { Router } from 'express';
import {
  CLARIFICATION_START,
  GENERAL_QUESTION_IDS,
  getQuestion,
  loadActiveCareers,
  MAX_QUESTIONS,
  createAssessmentState,
  evaluateAnswers,
  publicQuestion,
  scoringKeywords,
  selectNextQuestion,
  validateAnswers,
} from '../services/assessment.js';
import { prepareClarifications } from '../services/assessment-clarifications.js';
import { localizeBankQuestion } from '../services/assessment-language.js';
import { addEnrichment, enrichRecommendations } from '../services/gemini.js';
import { assertAuthConfigured, createAccessToken, optionalAuthentication } from '../services/auth.js';
import { assessmentAiBudget } from '../services/ai-limits.js';
import { buildUserContext } from '../services/user-context.js';

const sessions = new Map();

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Request body must be an object');
  }
  return body;
}

async function assessmentLanguage(database, auth, language) {
  if (language === 'en' || language === 'zh-CN') return language;
  if (language === undefined) {
    if (!auth || auth.isGuest) return 'en';
    const { rows } = await database.query('SELECT preferred_language FROM users WHERE id = $1', [auth.userId]);
    return rows[0]?.preferred_language === 'zh-CN' ? 'zh-CN' : 'en';
  }
  throw validationError('language must be en or zh-CN');
}

function publicProgress(state, question) {
  const answered = state.answers.length;
  const stage = answered < GENERAL_QUESTION_IDS.length ? 'general'
    : answered < CLARIFICATION_START ? 'adaptive' : 'clarification';
  return {
    question: { ...publicQuestion(question), source: question.source || 'bank', allows_custom_answer: true },
    progress: { answered, target: MAX_QUESTIONS },
    stage,
    language: state.language,
    ...(state.clarificationPlan ? { clarifications: clarificationSummary(state.clarificationPlan) } : {}),
  };
}

function clarificationSummary(plan) {
  const count = plan.questions.filter(({ source }) => source === 'ai').length;
  return {
    status: count === 4 ? 'ai' : count ? 'mixed' : 'fallback',
    ai_questions: count,
    ...(plan.provider ? { provider: plan.provider } : {}),
    ...(plan.reason ? { reason: plan.reason } : {}),
  };
}

function customAnalysis(answers, earlierEvidence, enrichment) {
  const evidence = new Map([...earlierEvidence, ...(enrichment.custom_evidence || [])]
    .map((item) => [item.question_id, item]));
  return answers.filter(({ custom_answer }) => custom_answer).map(({ question_id, custom_answer }) => ({
    question_id,
    source: evidence.has(question_id) ? 'ai' : 'fallback',
    evidence: evidence.get(question_id) || null,
    scoring_keywords: scoringKeywords({ question_id, custom_answer }),
  }));
}

async function createGuest(database) {
  const result = await database.query(
    `INSERT INTO users (display_name, background, is_guest)
     VALUES ('Guest', 'Career assessment participant', TRUE)
     RETURNING id`,
  );
  return result.rows[0].id;
}

async function persistResult(database, state, evaluation, recommendations) {
  const result = await database.query(
    `INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles, career_match)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb)
     RETURNING id, completed_at`,
    [
      state.userId,
      JSON.stringify(state.answers),
      JSON.stringify(evaluation.trait_scores),
      JSON.stringify(evaluation.recommendations.professions),
      JSON.stringify({ language: state.language, trait_scores: evaluation.trait_scores, ...recommendations }),
    ],
  );
  return result.rows[0] || {};
}

async function enrichForUser(database, state, evaluation, isGuest, waitForSlot = false) {
  const { userId, answers, language } = state;
  let userContext;
  try {
    userContext = await buildUserContext(database, userId, { loadAssessment: false });
  } catch {
    userContext = undefined;
  }
  return enrichRecommendations({
    userId,
    answers,
    traitScores: evaluation.trait_scores,
    recommendations: evaluation.recommendations,
    userContext,
    language,
    ...assessmentAiBudget(database, state, isGuest, 'final'),
    waitForSlot,
  });
}

async function finish(database, state, isGuest) {
  const roles = await loadActiveCareers(database);
  const evaluation = evaluateAnswers(state.answers, roles, state.language);
  const enrichment = await enrichForUser(database, state, evaluation, isGuest, true);
  const recommendations = addEnrichment(evaluation.recommendations, enrichment, state.language);
  const saved = await persistResult(database, state, evaluation, recommendations);
  return {
    assessment_id: state.id,
    session_id: saved.id || null,
    user_id: state.userId,
    completed_at: saved.completed_at || new Date().toISOString(),
    trait_scores: evaluation.trait_scores,
    language: state.language,
    clarifications: clarificationSummary(state.clarificationPlan),
    custom_analysis: customAnalysis(state.answers, state.clarificationPlan.custom_evidence, enrichment),
    ...recommendations,
  };
}

export default function createAssessmentRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database));

  router.post('/start', async (request, response, next) => {
    try {
      const body = bodyObject(request.body || {});
      if ('user_id' in body) throw validationError('user_id is assigned by the authentication token');
      const language = await assessmentLanguage(database, request.auth, body.language);
      if (!request.auth) assertAuthConfigured();
      const userId = request.auth?.userId || await createGuest(database);
      const state = createAssessmentState(userId);
      state.language = language;
      state.question = localizeBankQuestion(getQuestion(GENERAL_QUESTION_IDS[0]), state.language);
      sessions.set(state.id, state);

      return response.status(201).json({
        assessment_id: state.id,
        user_id: state.userId,
        ...(!request.auth ? { access_token: createAccessToken({ id: userId, is_guest: true }), token_type: 'Bearer' } : {}),
        ...publicProgress(state, state.question),
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/answer', async (request, response, next) => {
    try {
      const body = bodyObject(request.body);
      if (typeof body.assessment_id !== 'string' || !body.assessment_id.trim()) {
        throw validationError('assessment_id must be a non-empty string');
      }
      if (typeof body.question_id !== 'string' || !body.question_id.trim()) {
        throw validationError('question_id must be a non-empty string');
      }
      const state = sessions.get(body.assessment_id);
      if (!state) {
        const error = new Error('Assessment not found or expired');
        error.status = 404;
        throw error;
      }
      if (!request.auth || request.auth.userId !== state.userId) {
        const error = new Error('Assessment requires its owner bearer token');
        error.status = 403;
        throw error;
      }

      if (state.processing) return response.status(409).json({ error: 'Assessment answer is already being processed' });
      const currentQuestion = state.question;
      if (currentQuestion.id !== body.question_id) {
        throw validationError('question_id is not the current assessment question');
      }

      const [answer] = validateAnswers([{
        question_id: body.question_id,
        option_id: body.option_id,
        custom_answer: body.custom_answer,
        note: body.note,
      }], { questionFor: () => currentQuestion });
      if (currentQuestion.source) answer.question = { ...publicQuestion(currentQuestion), source: currentQuestion.source };
      state.answers.push(answer);
      state.processing = true;
      try {
        if (state.answers.length === MAX_QUESTIONS) {
          const result = await finish(database, state, request.auth.isGuest);
          sessions.delete(state.id);
          return response.json({ complete: true, result });
        }
        if (state.answers.length === CLARIFICATION_START) {
          state.clarificationPlan = await prepareClarifications({
            userId: state.userId,
            answers: state.answers,
            language: state.language,
            ...assessmentAiBudget(database, state, request.auth.isGuest, 'clarification'),
          });
        }
        state.question = state.clarificationPlan
          ? state.clarificationPlan.questions[state.answers.length - CLARIFICATION_START]
          : localizeBankQuestion(selectNextQuestion(state.answers), state.language);
        return response.json({ complete: false, assessment_id: state.id, ...publicProgress(state, state.question) });
      } catch (error) {
        state.answers.pop();
        throw error;
      } finally {
        state.processing = false;
      }
    } catch (error) {
      return next(error);
    }
  });

  router.post('/evaluate', async (request, response, next) => {
    try {
      const body = bodyObject(request.body);
      const answers = validateAnswers(body.answers, { minimum: 15, maximum: MAX_QUESTIONS });
      const language = await assessmentLanguage(database, request.auth, body.language);
      const roles = await loadActiveCareers(database);
      if ('user_id' in body) throw validationError('user_id is assigned by the authentication token');
      if (!request.auth) assertAuthConfigured();
      const userId = request.auth?.userId || await createGuest(database);
      const evaluation = evaluateAnswers(answers, roles, language);
      const state = createAssessmentState(userId);
      state.answers = answers;
      state.language = language;
      const enrichment = await enrichForUser(database, state, evaluation, request.auth?.isGuest ?? true);
      const recommendations = addEnrichment(evaluation.recommendations, enrichment, language);
      const saved = await persistResult(database, state, evaluation, recommendations);

      return response.status(201).json({
        assessment_id: state.id,
        session_id: saved.id || null,
        user_id: userId,
        ...(!request.auth ? { access_token: createAccessToken({ id: userId, is_guest: true }), token_type: 'Bearer' } : {}),
        completed_at: saved.completed_at || new Date().toISOString(),
        trait_scores: evaluation.trait_scores,
        language,
        custom_analysis: customAnalysis(answers, [], enrichment),
        ...recommendations,
      });
    } catch (error) {
      return next(error);
    }
  });

  router.use((error, request, response, next) => {
    if (error.code === '42703' || error.code === '42P01') {
      return response.status(503).json({ error: 'Assessment database schema is out of date' });
    }
    return next(error);
  });

  return router;
}

export function clearAssessmentSessions(userId) {
  if (userId === undefined) {
    sessions.clear();
    return;
  }
  for (const [id, session] of sessions) {
    if (session.userId === userId) sessions.delete(id);
  }
}
