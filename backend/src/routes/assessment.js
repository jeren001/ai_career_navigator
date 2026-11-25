import { Router } from 'express';
import {
  MAX_QUESTIONS,
  createAssessmentState,
  evaluateAnswers,
  initialQuestion,
  publicQuestion,
  selectNextQuestion,
  validateAnswers,
} from '../services/assessment.js';
import { addEnrichment, enrichRecommendations } from '../services/gemini.js';
import { assertAuthConfigured, createAccessToken, optionalAuthentication } from '../services/auth.js';
import { reserveDailyAiRequest } from '../services/ai-limits.js';
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

async function createGuest(database) {
  const result = await database.query(
    `INSERT INTO users (display_name, background, is_guest)
     VALUES ('Guest', 'Career assessment participant', TRUE)
     RETURNING id`,
  );
  return result.rows[0].id;
}

async function loadRoles(database) {
  const result = await database.query(
    'SELECT * FROM career_roles WHERE is_active = TRUE ORDER BY id',
  );
  return result.rows;
}

async function persistResult(database, state, answers, evaluation) {
  const result = await database.query(
    `INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles)
     VALUES ($1, $2::jsonb, $3::jsonb, $4::jsonb)
     RETURNING id, completed_at`,
    [
      state.userId,
      JSON.stringify(answers),
      JSON.stringify(evaluation.trait_scores),
      JSON.stringify(evaluation.recommendations.professions),
    ],
  );
  return result.rows[0] || {};
}

async function enrichForUser(database, userId, isGuest, answers, evaluation) {
  let userContext;
  try {
    userContext = await buildUserContext(database, userId);
  } catch {
    userContext = undefined;
  }
  return enrichRecommendations({
    userId,
    answers,
    traitScores: evaluation.trait_scores,
    recommendations: evaluation.recommendations,
    userContext,
    isGuest,
    beforeRequest: () => reserveDailyAiRequest(database, userId),
  });
}

async function finish(database, state) {
  const roles = await loadRoles(database);
  if (roles.length === 0) {
    const error = new Error('No active career roles are available');
    error.status = 503;
    throw error;
  }
  const evaluation = evaluateAnswers(state.answers, roles);
  const saved = await persistResult(database, state, state.answers, evaluation);
  const enrichment = await enrichForUser(database, state.userId, state.isGuest, state.answers, evaluation);
  return {
    assessment_id: state.id,
    session_id: saved.id || null,
    user_id: state.userId,
    completed_at: saved.completed_at || new Date().toISOString(),
    trait_scores: evaluation.trait_scores,
    ...addEnrichment(evaluation.recommendations, enrichment),
  };
}

export default function createAssessmentRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database));

  router.post('/start', async (request, response, next) => {
    try {
      const body = bodyObject(request.body || {});
      if ('user_id' in body) throw validationError('user_id is assigned by the authentication token');
      if (!request.auth) assertAuthConfigured();
      const userId = request.auth?.userId || await createGuest(database);
      const isGuest = request.auth?.isGuest ?? true;
      const state = createAssessmentState(userId);
      state.isGuest = isGuest;
      sessions.set(state.id, state);

      return response.status(201).json({
        assessment_id: state.id,
        user_id: state.userId,
        ...(!request.auth ? { access_token: createAccessToken({ id: userId, is_guest: true }), token_type: 'Bearer' } : {}),
        question: initialQuestion(),
        progress: { answered: 0, target: MAX_QUESTIONS },
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

      const nextQuestion = selectNextQuestion(state.answers);
      if (!nextQuestion || nextQuestion.id !== body.question_id) {
        throw validationError('question_id is not the current assessment question');
      }

      const [answer] = validateAnswers([{
        question_id: body.question_id,
        option_id: body.option_id,
        note: body.note,
      }]);
      state.answers.push(answer);

      if (state.answers.length >= MAX_QUESTIONS) {
        const result = await finish(database, state);
        sessions.delete(state.id);
        return response.json({ complete: true, result });
      }

      const question = selectNextQuestion(state.answers);
      if (!question) {
        const result = await finish(database, state);
        sessions.delete(state.id);
        return response.json({ complete: true, result });
      }

      return response.json({
        complete: false,
        assessment_id: state.id,
        question: publicQuestion(question),
        progress: { answered: state.answers.length, target: MAX_QUESTIONS },
      });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/evaluate', async (request, response, next) => {
    try {
      const body = bodyObject(request.body);
      const answers = validateAnswers(body.answers, { minimum: 15, maximum: MAX_QUESTIONS });
      const roles = await loadRoles(database);
      if (roles.length === 0) {
        const error = new Error('No active career roles are available');
        error.status = 503;
        throw error;
      }
      if ('user_id' in body) throw validationError('user_id is assigned by the authentication token');
      if (!request.auth) assertAuthConfigured();
      const userId = request.auth?.userId || await createGuest(database);
      const isGuest = request.auth?.isGuest ?? true;
      const evaluation = evaluateAnswers(answers, roles);
      const state = createAssessmentState(userId);
      state.answers = answers;
      state.isGuest = isGuest;
      const saved = await persistResult(database, state, answers, evaluation);
      const enrichment = await enrichForUser(database, userId, isGuest, answers, evaluation);

      return response.status(201).json({
        assessment_id: state.id,
        session_id: saved.id || null,
        user_id: userId,
        ...(!request.auth ? { access_token: createAccessToken({ id: userId, is_guest: true }), token_type: 'Bearer' } : {}),
        completed_at: saved.completed_at || new Date().toISOString(),
        trait_scores: evaluation.trait_scores,
        ...addEnrichment(evaluation.recommendations, enrichment),
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

export function clearAssessmentSessions() {
  sessions.clear();
}
