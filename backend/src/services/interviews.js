import { randomUUID } from 'node:crypto';
import { catalogLanguage } from './challenge-catalog.js';
import { bankFollowUp, evaluateInterview, selectInterviewFollowUp } from './interview-ai.js';
import { INTERVIEW_DIFFICULTIES, interviewGuidance, interviewRounds } from './interview-bank.js';
import { skillsBody, skillsError } from './user-skills.js';

const columns = `id, user_id, profession, difficulty, language, rounds, revision, evaluation, created_at, updated_at,
  COALESCE(operation_started_at > clock_timestamp() - INTERVAL '1 minute', false) AS processing`;

function progress(session) {
  const answered = session.rounds.reduce((count, round) =>
    count + Number(Boolean(round.answer)) + Number(Boolean(round.follow_up_answer)), 0);
  return { answered, total: session.rounds.length * 2 };
}

function sessionSummary(session) {
  const { id, profession, difficulty, language, created_at, updated_at } = session;
  const counts = progress(session);
  return {
    id, profession, difficulty, language, created_at, updated_at,
    status: counts.answered === counts.total ? 'completed' : 'in_progress',
    processing: session.processing,
    progress: counts,
    evaluation_status: session.evaluation?.status ?? 'pending',
    score: session.evaluation?.status === 'ai'
      ? { points: session.evaluation.points, max_points: session.evaluation.max_points } : null,
  };
}

function currentRound(session) {
  const index = session.rounds.findIndex((round) => !round.follow_up_answer);
  const round = session.rounds[index];
  return { index, question: round?.follow_up ?? round?.question ?? null };
}

function publicSession(session) {
  const transcript = session.rounds.flatMap((round) => {
    if (!round.answer) return [];
    const entries = [{ question: round.question, answer: round.answer }];
    if (round.follow_up_answer) entries.push({ question: round.follow_up, answer: round.follow_up_answer });
    return entries;
  });
  return {
    ...sessionSummary(session),
    current_question: session.processing ? null : currentRound(session).question,
    transcript,
    evaluation: session.evaluation,
    guidance: interviewGuidance(session.language),
  };
}

async function ownSession(database, userId, id) {
  const { rows } = await database.query(`SELECT ${columns} FROM interview_sessions WHERE user_id = $1 AND id = $2`, [userId, id]);
  if (!rows.length) throw skillsError(404, 'Interview session not found');
  return rows[0];
}

export async function createInterview(database, userId, raw) {
  const { profession_slug: slug, difficulty, language } = skillsBody(raw, ['profession_slug', 'difficulty', 'language']);
  if (typeof slug !== 'string' || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw skillsError(400, 'profession_slug must be a career slug');
  }
  if (!INTERVIEW_DIFFICULTIES.includes(difficulty)) throw skillsError(400, 'Invalid interview difficulty');
  const selectedLanguage = catalogLanguage(language);
  const { rows: [role] } = await database.query(
    `SELECT id, slug, title, market_pulse->>'career_field' AS career_field,
        market_pulse #>> '{translations,zh-CN,title}' AS chinese_title
     FROM career_roles WHERE slug = $1 AND is_active`,
    [slug],
  );
  if (!role) throw skillsError(404, 'Active profession not found');
  const profession = {
    id: role.id, slug, career_field: role.career_field,
    title: (selectedLanguage === 'zh-CN' && role.chinese_title) || role.title,
  };
  const rounds = interviewRounds(profession, difficulty, selectedLanguage);
  if (rounds.length !== 3) throw skillsError(409, 'Interview questions are unavailable for this profession and difficulty');
  const { rows: [session] } = await database.query(
    `INSERT INTO interview_sessions (id, user_id, profession, difficulty, language, rounds)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${columns}`,
    [randomUUID(), userId, JSON.stringify(profession), difficulty, selectedLanguage, JSON.stringify(rounds)],
  );
  return publicSession(session);
}

export async function readInterview(database, userId, id) {
  return publicSession(await ownSession(database, userId, id));
}

export async function interviewHistory(database, userId, offset) {
  const { rows } = await database.query(
    `SELECT ${columns} FROM interview_sessions WHERE user_id = $1
     ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET $2`, [userId, offset],
  );
  return {
    sessions: rows.slice(0, 20).map(sessionSummary),
    next_offset: rows.length > 20 ? offset + 20 : null,
  };
}

async function finishOperation(database, { id, user_id: userId }, token, rounds, evaluation) {
  const { rows } = await database.query(
    `UPDATE interview_sessions SET rounds = $4, evaluation = $5, operation_token = NULL, operation_started_at = NULL,
       revision = revision + 1, updated_at = clock_timestamp()
     WHERE user_id = $1 AND id = $2 AND operation_token = $3 RETURNING ${columns}`,
    [userId, id, token, JSON.stringify(rounds), evaluation && JSON.stringify(evaluation)],
  );
  return publicSession(rows[0] ?? await ownSession(database, userId, id));
}

export async function answerInterview(database, userId, id, raw) {
  const { question_id: questionId, answer } = skillsBody(raw, ['question_id', 'answer']);
  if (typeof questionId !== 'string' || typeof answer !== 'string' || !answer.trim() ||
      answer.length > 1500 || answer.includes('\0')) {
    throw skillsError(400, 'Provide a question_id and nonempty answer text of at most 1500 characters');
  }
  const session = await ownSession(database, userId, id);
  if (session.processing) throw skillsError(409, 'This interview is processing a request');
  const { question, index } = currentRound(session);
  if (questionId !== question?.id) throw skillsError(409, 'Submit an answer to the current interview question');
  const round = session.rounds[index];
  const isMain = question.type !== 'follow_up';
  const token = isMain ? randomUUID() : null;
  if (isMain) {
    round.answer = answer.trim();
    round.follow_up = bankFollowUp(round, 'unavailable');
  } else {
    round.follow_up_answer = answer.trim();
  }
  const { rows: [saved] } = await database.query(
    `UPDATE interview_sessions SET rounds = $4, revision = revision + 1, operation_token = $5::uuid,
       operation_started_at = CASE WHEN $5::uuid IS NOT NULL THEN clock_timestamp() END, updated_at = clock_timestamp()
     WHERE user_id = $1 AND id = $2 AND revision = $3 RETURNING ${columns}`,
    [userId, id, session.revision, JSON.stringify(session.rounds), token],
  );
  if (!saved) throw skillsError(409, 'This interview changed. Reload the current question');
  if (!isMain) return publicSession(saved);
  round.follow_up = await selectInterviewFollowUp(database, session, round, round.answer);
  return finishOperation(database, session, token, session.rounds, null);
}

export async function requestInterviewEvaluation(database, userId, id) {
  const session = await ownSession(database, userId, id);
  if (session.rounds.some((round) => !round.follow_up_answer)) {
    throw skillsError(409, 'Complete the interview before requesting feedback');
  }
  if (session.processing || session.evaluation?.status === 'ai') return publicSession(session);
  const token = randomUUID();
  const { rowCount } = await database.query(
    `UPDATE interview_sessions SET operation_token = $4, operation_started_at = clock_timestamp(),
       revision = revision + 1, updated_at = clock_timestamp()
     WHERE user_id = $1 AND id = $2 AND revision = $3`,
    [userId, id, session.revision, token],
  );
  if (!rowCount) return publicSession(await ownSession(database, userId, id));
  const evaluation = await evaluateInterview(database, session);
  return finishOperation(database, session, token, session.rounds, evaluation);
}
