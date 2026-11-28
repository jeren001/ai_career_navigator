import { randomUUID } from 'node:crypto';
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
import { assertAuthConfigured, createAccessToken, optionalAuthentication, requireAnyIdentity } from '../services/auth.js';
import { assessmentAiBudget } from '../services/ai-limits.js';
import { buildUserContext } from '../services/user-context.js';
import { skillsError } from '../services/user-skills.js';

const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const historyPageSize = 20;

function assessmentId(value) {
  if (typeof value !== 'string' || !uuid.test(value)) throw validationError('assessment_id must be a UUID');
  return value;
}

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

async function persistResult(database, state, evaluation, recommendations, result, claim = null) {
  const values = [
    state.userId, JSON.stringify(state.answers), JSON.stringify(evaluation.trait_scores),
    JSON.stringify(evaluation.recommendations.professions),
    JSON.stringify({ language: state.language, trait_scores: evaluation.trait_scores, ...recommendations }),
    state.id, JSON.stringify(result),
  ];
  const columns = 'user_id, answers, trait_scores, recommended_roles, career_match, assessment_id, assessment_result';
  const fields = '$1, $2::jsonb, $3::jsonb, $4::jsonb, $5::jsonb, $6, $7::jsonb';
  const { rows: [saved] } = claim
    ? await database.query(
      `WITH finished AS (
         DELETE FROM assessment_drafts WHERE id = $6 AND user_id = $1 AND claim_id = $8 RETURNING id
       )
       INSERT INTO quiz_sessions (${columns}) SELECT ${fields} FROM finished RETURNING id, completed_at`,
      [...values, claim],
    )
    : await database.query(
      `INSERT INTO quiz_sessions (${columns}) VALUES (${fields}) RETURNING id, completed_at`, values,
    );
  if (!saved) throw skillsError(409, 'Assessment progress changed. Reload the assessment.');
  return { ...result, assessment_id: state.id, session_id: saved.id, user_id: state.userId, completed_at: saved.completed_at };
}

function savedResult(row, userId) {
  return {
    ...(row.assessment_result ?? {
      ...(row.career_match ?? { professions: row.recommended_roles, language: null }),
      trait_scores: row.trait_scores,
    }),
    assessment_id: row.assessment_id,
    session_id: row.id,
    user_id: userId,
    completed_at: row.completed_at,
  };
}

const resultColumns = 'id, assessment_id, completed_at, assessment_result, career_match, trait_scores, recommended_roles';

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

async function finish(database, state, isGuest, claim) {
  const roles = await loadActiveCareers(database);
  const evaluation = evaluateAnswers(state.answers, roles, state.language);
  const enrichment = await enrichForUser(database, state, evaluation, isGuest, true);
  const recommendations = addEnrichment(evaluation.recommendations, enrichment, state.language);
  return persistResult(database, state, evaluation, recommendations, {
    trait_scores: evaluation.trait_scores,
    language: state.language,
    clarifications: clarificationSummary(state.clarificationPlan),
    custom_analysis: customAnalysis(state.answers, state.clarificationPlan.custom_evidence, enrichment),
    ...recommendations,
  }, claim);
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
      await database.query('INSERT INTO assessment_drafts (id, user_id, state) VALUES ($1, $2, $3)',
        [state.id, userId, JSON.stringify(state)]);

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

  router.get('/history', requireAnyIdentity, async (request, response, next) => {
    try {
      const { userId } = request.auth;
      const { before } = request.query;
      if (before !== undefined && (typeof before !== 'string' || !/^[1-9]\d{0,9}$/.test(before) || Number(before) > 2_147_483_647)) {
        throw validationError('before must be a positive session ID');
      }
      const { rows } = await database.query(
        `SELECT ${resultColumns} FROM quiz_sessions
         WHERE user_id = $1 AND ($2::integer IS NULL OR id < $2)
         ORDER BY id DESC LIMIT $3`, [userId, before ?? null, historyPageSize + 1],
      );
      response.set('Cache-Control', 'private, no-store').json({
        assessments: rows.slice(0, historyPageSize).map((row) => savedResult(row, userId)),
        next_before: rows.length > historyPageSize ? rows[historyPageSize - 1].id : null,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/drafts', requireAnyIdentity, async (request, response, next) => {
    try {
      const { rows } = await database.query(
        `SELECT id, updated_at, state->>'language' AS language, jsonb_array_length(state->'answers') AS answered
         FROM assessment_drafts WHERE user_id = $1 ORDER BY updated_at DESC, id DESC LIMIT 20`, [request.auth.userId],
      );
      response.set('Cache-Control', 'private, no-store').json({
        drafts: rows.map(({ id, updated_at, language, answered }) => ({
          assessment_id: id, updated_at, language, progress: { answered, target: MAX_QUESTIONS },
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', requireAnyIdentity, async (request, response, next) => {
    try {
      const id = assessmentId(request.params.id);
      const { userId } = request.auth;
      const { rows: [draft] } = await database.query(
        'SELECT state FROM assessment_drafts WHERE id = $1 AND user_id = $2', [id, userId],
      );
      response.set('Cache-Control', 'private, no-store');
      if (draft) return response.json({ complete: false, assessment_id: id, ...publicProgress(draft.state, draft.state.question) });
      const { rows: [saved] } = await database.query(
        `SELECT ${resultColumns} FROM quiz_sessions WHERE assessment_id = $1 AND user_id = $2`, [id, userId],
      );
      if (!saved) throw skillsError(404, 'Assessment not found');
      return response.json({ complete: true, result: savedResult(saved, userId) });
    } catch (error) {
      return next(error);
    }
  });

  router.post('/answer', async (request, response, next) => {
    try {
      const body = bodyObject(request.body);
      const id = assessmentId(body.assessment_id);
      if (typeof body.question_id !== 'string' || !body.question_id.trim()) {
        throw validationError('question_id must be a non-empty string');
      }
      if (!request.auth) throw skillsError(403, 'Assessment requires its owner bearer token');
      const { userId, isGuest } = request.auth;
      const { rows: [draft] } = await database.query(
        'SELECT state FROM assessment_drafts WHERE id = $1 AND user_id = $2', [id, userId],
      );
      if (!draft) throw skillsError(404, 'Assessment not found or expired');
      const state = draft.state;
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

      const claim = randomUUID();
      const claimed = await database.query(
        `UPDATE assessment_drafts SET claim_id = $4, claim_expires_at = clock_timestamp() + interval '2 minutes'
         WHERE id = $1 AND user_id = $2 AND state->'question'->>'id' = $3
           AND (claim_id IS NULL OR claim_expires_at <= clock_timestamp())`,
        [id, userId, currentQuestion.id, claim],
      );
      if (!claimed.rowCount) throw skillsError(409, 'Assessment answer is already being processed or progress changed');

      let saved = false;
      try {
        state.answers.push(answer);
        if (state.answers.length === MAX_QUESTIONS) {
          const result = await finish(database, state, isGuest, claim);
          saved = true;
          return response.json({ complete: true, result });
        }
        if (state.answers.length === CLARIFICATION_START) {
          state.clarificationPlan = await prepareClarifications({
            userId, answers: state.answers, language: state.language,
            ...assessmentAiBudget(database, state, isGuest, 'clarification'),
          });
        }
        state.question = state.clarificationPlan
          ? state.clarificationPlan.questions[state.answers.length - CLARIFICATION_START]
          : localizeBankQuestion(selectNextQuestion(state.answers), state.language);
        const updated = await database.query(
          `UPDATE assessment_drafts SET state = $4, updated_at = clock_timestamp(), claim_id = NULL, claim_expires_at = NULL
           WHERE id = $1 AND user_id = $2 AND claim_id = $3`,
          [id, userId, claim, JSON.stringify(state)],
        );
        if (!updated.rowCount) throw skillsError(409, 'Assessment progress changed. Reload the assessment.');
        saved = true;
        return response.json({ complete: false, assessment_id: id, ...publicProgress(state, state.question) });
      } finally {
        if (!saved) {
          await database.query(
            'UPDATE assessment_drafts SET claim_id = NULL, claim_expires_at = NULL WHERE id = $1 AND user_id = $2 AND claim_id = $3',
            [id, userId, claim],
          ).catch(() => {});
        }
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
      const result = await persistResult(database, state, evaluation, recommendations, {
        trait_scores: evaluation.trait_scores,
        language,
        custom_analysis: customAnalysis(answers, [], enrichment),
        ...recommendations,
      });
      return response.status(201).json({
        ...result,
        ...(!request.auth ? { access_token: createAccessToken({ id: userId, is_guest: true }), token_type: 'Bearer' } : {}),
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
