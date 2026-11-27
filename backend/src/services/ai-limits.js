import { aiInteger } from './ai-config.js';

const MAX_SMALLINT = 32767;

export async function reserveDailyAiRequest(database, userId) {
  const limit = aiInteger('AI_ACCOUNT_DAILY_LIMIT', 5, 0, MAX_SMALLINT);
  if (limit === 0) return false;
  const result = await database.query(
    `INSERT INTO ai_usage_daily (user_id, usage_date, request_count, request_limit)
     SELECT id, CURRENT_DATE, 1, $2::smallint
     FROM users WHERE id = $1 AND NOT is_guest
     ON CONFLICT (user_id, usage_date) DO UPDATE
       SET request_count = ai_usage_daily.request_count + 1,
           request_limit = EXCLUDED.request_limit
       WHERE ai_usage_daily.request_count < EXCLUDED.request_limit
     RETURNING request_count, request_limit`,
    [userId, limit],
  );
  return result.rows.length > 0;
}

export function assessmentAiBudget(database, state, isGuest, stage) {
  const guestLimit = aiInteger('AI_GUEST_STAGE_ATTEMPTS', 2, 0, MAX_SMALLINT);
  return {
    maxAttempts: isGuest ? Math.max(1, guestLimit) : undefined,
    quotaReason: isGuest ? 'session_limit' : 'daily_limit',
    beforeRequest: isGuest
      ? () => guestLimit > 0 && reserveGuestAttempt(database, state, stage, guestLimit)
      : () => reserveDailyAiRequest(database, state.userId),
  };
}

async function reserveGuestAttempt(database, { userId, id, createdAt }, stage, limit) {
  const isClarification = stage === 'clarification';
  const result = await database.query(
    `INSERT INTO guest_assessment_ai_usage (user_id, usage_date, assessment_id, clarification_attempts, final_attempts)
     SELECT id, $2::date, $3::uuid, $4::smallint, $5::smallint FROM users WHERE id = $1 AND is_guest
     ON CONFLICT (user_id, usage_date) DO UPDATE
       SET clarification_attempts = guest_assessment_ai_usage.clarification_attempts + EXCLUDED.clarification_attempts,
           final_attempts = guest_assessment_ai_usage.final_attempts + EXCLUDED.final_attempts
       WHERE guest_assessment_ai_usage.assessment_id = EXCLUDED.assessment_id
         AND CASE WHEN $4::smallint = 1 THEN guest_assessment_ai_usage.clarification_attempts
                  ELSE guest_assessment_ai_usage.final_attempts END < $6
     RETURNING assessment_id`,
    [userId, createdAt.slice(0, 10), id, Number(isClarification), Number(!isClarification), limit],
  );
  return result.rows.length > 0;
}
