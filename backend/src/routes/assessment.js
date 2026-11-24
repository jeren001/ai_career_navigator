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

const sessions = new Map();

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function positiveInteger(value, field) {
  if (!Number.isInteger(value) || value < 1) {
    throw validationError(`${field} must be a positive integer`);
  }
  return value;
}

function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw validationError('Request body must be an object');
  }
  return body;
}

async function createGuest(database) {
  const result = await database.query(
    `INSERT INTO users (display_name, background)
     VALUES ('Guest', 'Career assessment participant')
     RETURNING id`,
  );
  return result.rows[0].id;
}

async function resolveUser(database, rawUserId) {
  if (rawUserId === undefined) return createGuest(database);
  const userId = positiveInteger(rawUserId, 'user_id');
  const result = await database.query('SELECT id FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }
  return userId;
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

async function finish(database, state) {
  const roles = await loadRoles(database);
  if (roles.length === 0) {
    const error = new Error('No active career roles are available');
    error.status = 503;
    throw error;
  }
  const evaluation = evaluateAnswers(state.answers, roles);
  const saved = await persistResult(database, state, state.answers, evaluation);
  return {
    assessment_id: state.id,
    session_id: saved.id || null,
    user_id: state.userId,
    completed_at: saved.completed_at || new Date().toISOString(),
    trait_scores: evaluation.trait_scores,
    ...evaluation.recommendations,
  };
}

export default function createAssessmentRouter(database) {
  const router = Router();

  router.post('/start', async (request, response, next) => {
    try {
      const body = bodyObject(request.body || {});
      const userId = await resolveUser(database, body.user_id);
      const state = createAssessmentState(userId);
      sessions.set(state.id, state);

      return response.status(201).json({
        assessment_id: state.id,
        user_id: state.userId,
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
      const userId = await resolveUser(database, body.user_id);
      const evaluation = evaluateAnswers(answers, roles);
      const state = createAssessmentState(userId);
      state.answers = answers;
      const saved = await persistResult(database, state, answers, evaluation);

      return response.status(201).json({
        assessment_id: state.id,
        session_id: saved.id || null,
        user_id: userId,
        completed_at: saved.completed_at || new Date().toISOString(),
        trait_scores: evaluation.trait_scores,
        ...evaluation.recommendations,
      });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}

export function clearAssessmentSessions() {
  sessions.clear();
}
