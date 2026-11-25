const GUEST_DAILY_LIMIT = 1;
const ACCOUNT_DAILY_LIMIT = 5;

export async function reserveDailyAiRequest(database, userId) {
  const result = await database.query(
    `INSERT INTO ai_usage_daily (user_id, usage_date, request_count, request_limit)
     SELECT id, CURRENT_DATE, 1, CASE WHEN is_guest THEN $2::smallint ELSE $3::smallint END
     FROM users WHERE id = $1
     ON CONFLICT (user_id, usage_date) DO UPDATE
       SET request_count = ai_usage_daily.request_count + 1,
           request_limit = EXCLUDED.request_limit
       WHERE ai_usage_daily.request_count < EXCLUDED.request_limit
     RETURNING request_count, request_limit`,
    [userId, GUEST_DAILY_LIMIT, ACCOUNT_DAILY_LIMIT],
  );
  return result.rows.length > 0;
}
