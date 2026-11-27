import { randomUUID } from 'node:crypto';
import pool from '../db/pool.js';
import { aiInteger } from './ai-config.js';

function configuredInteger(name) {
  const raw = process.env[name]?.trim();
  if (!raw) return null;
  return /^\d{1,12}$/.test(raw) ? BigInt(raw) : undefined;
}

function tokenCost(input, output, inputRate, outputRate) {
  return (BigInt(input) * inputRate + BigInt(output) * outputRate + 999999n) / 1000000n;
}

export function reserveArkSpend(model, request, database = pool) {
  return reserveSpend({
    model, request, database, prefix: 'ARK', daily: 'ark_ai_daily_usage', attempts: 'ark_ai_attempts',
  });
}

export const OPENROUTER_DEFAULT_MODEL = 'nvidia/nemotron-3.5-super-vl:free';
export const OPENROUTER_FALLBACK_MODEL = 'baidu/ernie-5.5-flash-preview:free';

export function isFreeOpenRouterModel(model) {
  return typeof model === 'string' && /^[\w.-]+\/[\w.-]+:free$/.test(model);
}

export function reserveOpenRouterSpend(model, request, database = pool) {
  const limit = aiInteger('OPENROUTER_DAILY_REQUEST_LIMIT', 50, 0, 50);
  if (!limit || !isFreeOpenRouterModel(model)) return { reason: 'spending_limit' };
  return reserveSpend({
    model, request, database, prefix: 'OPENROUTER', daily: 'openrouter_ai_daily_usage',
    attempts: 'openrouter_ai_attempts', requestLimit: limit,
  });
}

async function reserveSpend({ model, request, database, prefix, daily, attempts, requestLimit }) {
  const limit = requestLimit ? null : configuredInteger(prefix + '_DAILY_SPEND_LIMIT_MICROS');
  const { inputRate, outputRate } = requestLimit ? { inputRate: 0n, outputRate: 0n } : {
    inputRate: configuredInteger(prefix + '_INPUT_COST_MICROS_PER_MILLION'),
    outputRate: configuredInteger(prefix + '_OUTPUT_COST_MICROS_PER_MILLION'),
  };
  if (limit === 0n) return { reason: 'spending_limit' };
  if ([limit, inputRate, outputRate].includes(undefined) ||
      (limit !== null && (inputRate === null || outputRate === null))) {
    return { reason: 'spending_limit_unavailable' };
  }

  // Byte length plus message overhead conservatively estimates input tokens.
  const estimatedInput = Buffer.byteLength(JSON.stringify(request), 'utf8') + 256;
  const priced = inputRate !== null && outputRate !== null;
  const reserved = priced ? tokenCost(estimatedInput, request.maxOutputTokens, inputRate, outputRate) : 0n;
  const id = randomUUID();
  const requestColumn = requestLimit ? ', request_count' : '';
  const initialRequestCount = requestLimit ? ', 1' : '';
  const incrementRequestCount = requestLimit ? `, request_count = ${daily}.request_count + 1` : '';
  const requestLimitCheck = requestLimit ? ` AND ${daily}.request_count < $5` : '';
  const result = await database.query(
    `WITH budget AS (
       INSERT INTO ${daily} (usage_date, accounted_cost_micros${requestColumn})
       SELECT (clock_timestamp() AT TIME ZONE 'UTC')::date, $2::bigint${initialRequestCount}
       WHERE $3::bigint IS NULL OR $2 <= $3
       ON CONFLICT (usage_date) DO UPDATE
       SET accounted_cost_micros = ${daily}.accounted_cost_micros + EXCLUDED.accounted_cost_micros${incrementRequestCount}
       WHERE ($3 IS NULL OR ${daily}.accounted_cost_micros + EXCLUDED.accounted_cost_micros <= $3)${requestLimitCheck}
       RETURNING usage_date
     )
     INSERT INTO ${attempts} (id, usage_date, model, reserved_cost_micros)
     SELECT $1, usage_date, $4, $2 FROM budget`,
    [id, reserved, limit, model, ...(requestLimit ? [requestLimit] : [])],
  );
  if (!result.rowCount) return { reason: requestLimit ? 'provider_daily_limit' : 'spending_limit' };

  return {
    async cancel() {
      await database.query(
        `WITH canceled AS (
           DELETE FROM ${attempts} WHERE id = $1 AND prompt_tokens IS NULL RETURNING usage_date, reserved_cost_micros
         )
         UPDATE ${daily} AS daily
         SET accounted_cost_micros = daily.accounted_cost_micros - canceled.reserved_cost_micros
             ${requestLimit ? ', request_count = daily.request_count - 1' : ''}
         FROM canceled WHERE daily.usage_date = canceled.usage_date`,
        [id],
      );
    },
    async settle(usage) {
      const { prompt_tokens: input, completion_tokens: output } = usage ?? {};
      if (![input, output].every((value) => Number.isSafeInteger(value) && value >= 0)) return;
      const cost = usage.cost;
      const billedMicros = Math.ceil(cost * 1_000_000);
      const actual = requestLimit && typeof cost === 'number' && cost >= 0 && Number.isSafeInteger(billedMicros)
        ? billedMicros
        : priced ? tokenCost(input, output, inputRate, outputRate) : null;
      await database.query(
        `WITH settled AS (
           UPDATE ${attempts}
           SET prompt_tokens = $2, completion_tokens = $3, actual_cost_micros = $4
           WHERE id = $1 AND prompt_tokens IS NULL RETURNING usage_date, reserved_cost_micros
         )
         UPDATE ${daily} AS daily
         SET accounted_cost_micros = daily.accounted_cost_micros + COALESCE($4, 0) - settled.reserved_cost_micros
         FROM settled WHERE daily.usage_date = settled.usage_date`,
        [id, input, output, actual],
      );
    },
  };
}
