import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pool from '../src/db/pool.js';
import { generateAiJson } from '../src/services/ai-service.js';
import { OPENROUTER_DEFAULT_MODEL } from '../src/services/ai-usage.js';

async function main() {
  if (process.env.RUN_OPENROUTER_LIVE_TEST !== '1') {
    console.log('Set RUN_OPENROUTER_LIVE_TEST=1 to run the live OpenRouter smoke test.');
    return;
  }
  assert.ok(process.env.OPENROUTER_API_KEY?.trim(), 'Set OPENROUTER_API_KEY locally.');
  process.env.AI_PRIMARY_PROVIDER = 'openrouter';
  process.env.AI_SECONDARY_PROVIDER = 'none';
  process.env.OPENROUTER_FALLBACK_MODEL = 'none';
  const model = process.env.OPENROUTER_MODEL?.trim() || OPENROUTER_DEFAULT_MODEL;
  const { rows: [{ started_at: startedAt }] } = await pool.query('SELECT clock_timestamp() AS started_at');
  const result = await generateAiJson({
    contents: 'Return Hello as en and 你好 as zh.',
    systemInstruction: 'Reply with the requested JSON object.',
    schema: {
      type: 'object', additionalProperties: false, required: ['en', 'zh'],
      properties: { en: { type: 'string' }, zh: { type: 'string' } },
    },
    userId: randomUUID(), maxOutputTokens: 64, maxAttempts: 1, cache: false,
    validate: (value) => value?.en === 'Hello' && value.zh === '你好' && Object.keys(value).length === 2
      ? value
      : undefined,
  });
  assert.equal(result.provider, 'openrouter', 'OpenRouter smoke request failed: ' + (result.reason ?? 'unexpected provider'));
  const { rows: [usage] } = await pool.query(
    `SELECT prompt_tokens, completion_tokens, actual_cost_micros FROM openrouter_ai_attempts
     WHERE model = $1 AND created_at >= $2 AND prompt_tokens > 0 AND completion_tokens > 0
     ORDER BY created_at DESC LIMIT 1`,
    [model, startedAt],
  );
  assert.ok(usage, 'Expected persisted OpenRouter token usage.');
  assert.equal(usage.actual_cost_micros, '0', 'Expected a zero-cost OpenRouter response.');
  console.log(JSON.stringify({ model, bilingualJson: true, ...usage }));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof assert.AssertionError ? error.message : 'Check the local database and migrations.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
