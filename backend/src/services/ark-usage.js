import { randomUUID } from 'node:crypto';
import pool from '../db/pool.js';

function configuredInteger(name) {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  return /^\d{1,12}$/.test(raw) ? BigInt(raw) : undefined;
}

function tokenCost(input, output, inputRate, outputRate) {
  return (BigInt(input) * inputRate + BigInt(output) * outputRate + 999999n) / 1000000n;
}

export async function reserveArkSpend(model, request, database = pool) {
  const limit = configuredInteger('ARK_DAILY_SPEND_LIMIT_MICROS');
  const inputRate = configuredInteger('ARK_INPUT_COST_MICROS_PER_MILLION');
  const outputRate = configuredInteger('ARK_OUTPUT_COST_MICROS_PER_MILLION');
  if ([limit, inputRate, outputRate].includes(undefined) ||
      (limit !== null && (inputRate === null || outputRate === null))) {
    return { reason: 'spending_limit_unavailable' };
  }
  if (limit === 0n) return { reason: 'spending_limit' };

  // Byte length plus message overhead conservatively estimates input tokens.
  const estimatedInput = Buffer.byteLength(JSON.stringify(request), 'utf8') + 256;
  const priced = inputRate !== null && outputRate !== null;
  const reserved = priced ? tokenCost(estimatedInput, request.maxOutputTokens, inputRate, outputRate) : 0n;
  const id = randomUUID();
  const result = await database.query(
    `WITH budget AS (
       INSERT INTO ark_ai_daily_usage (usage_date, accounted_cost_micros)
       SELECT (clock_timestamp() AT TIME ZONE 'UTC')::date, $2::bigint
       WHERE $3::bigint IS NULL OR $2 <= $3
       ON CONFLICT (usage_date) DO UPDATE
       SET accounted_cost_micros = ark_ai_daily_usage.accounted_cost_micros + EXCLUDED.accounted_cost_micros
       WHERE $3 IS NULL OR ark_ai_daily_usage.accounted_cost_micros + EXCLUDED.accounted_cost_micros <= $3
       RETURNING usage_date
     )
     INSERT INTO ark_ai_attempts (id, usage_date, model, reserved_cost_micros)
     SELECT $1, usage_date, $4, $2 FROM budget`,
    [id, reserved, limit, model],
  );
  if (!result.rowCount) return { reason: 'spending_limit' };

  return {
    async cancel() {
      await database.query(
        `WITH canceled AS (
           DELETE FROM ark_ai_attempts WHERE id = $1 RETURNING usage_date, reserved_cost_micros
         )
         UPDATE ark_ai_daily_usage AS daily
         SET accounted_cost_micros = daily.accounted_cost_micros - canceled.reserved_cost_micros
         FROM canceled WHERE daily.usage_date = canceled.usage_date`,
        [id],
      );
    },
    async settle(usage) {
      const { prompt_tokens: input, completion_tokens: output } = usage ?? {};
      if (![input, output].every((value) => Number.isSafeInteger(value) && value >= 0)) return;
      const actual = priced ? tokenCost(input, output, inputRate, outputRate) : null;
      await database.query(
        `WITH settled AS (
           UPDATE ark_ai_attempts
           SET prompt_tokens = $2, completion_tokens = $3, actual_cost_micros = $4
           WHERE id = $1 AND prompt_tokens IS NULL RETURNING usage_date, reserved_cost_micros
         )
         UPDATE ark_ai_daily_usage AS daily
         SET accounted_cost_micros = daily.accounted_cost_micros + COALESCE($4, 0) - settled.reserved_cost_micros
         FROM settled WHERE daily.usage_date = settled.usage_date`,
        [id, input, output, actual],
      );
    },
  };
}
