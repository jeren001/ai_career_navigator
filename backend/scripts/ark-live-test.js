import assert from 'node:assert/strict';
import pool from '../src/db/pool.js';
import { generateAiJson } from '../src/services/ai-service.js';

async function main() {
  if (process.env.RUN_ARK_LIVE_TEST !== '1') {
    console.log('Set RUN_ARK_LIVE_TEST=1 to run the live Ark smoke test.');
    return;
  }
  assert.ok(process.env.ARK_API_KEY?.trim() && process.env.ARK_MODEL?.trim(),
    'Set ARK_API_KEY and ARK_MODEL locally before running the smoke test');
  process.env.AI_PRIMARY_PROVIDER = 'ark';
  process.env.AI_SECONDARY_PROVIDER = 'none';
  const model = process.env.ARK_MODEL.trim();
  const { rows: [{ checked_at: checkedAt }] } = await pool.query('SELECT clock_timestamp() AS checked_at');
  for (const [contents, match] of [
    ['Return a greeting in English.', /[a-z]/i],
    ['请用简体中文问好。', /\p{Script=Han}/u],
  ]) {
    const result = await generateAiJson({
      contents, systemInstruction: 'Return a JSON object with a greeting field.',
      schema: { type: 'object', required: ['greeting'], properties: { greeting: { type: 'string' } } },
      maxOutputTokens: 64, maxAttempts: 1, waitForSlot: true, cache: false,
      validate: (value) => typeof value?.greeting === 'string' && match.test(value.greeting) ? value : undefined,
    });
    assert.equal(result.provider, 'ark', 'Ark smoke request failed: ' + (result.reason ?? 'unexpected provider'));
  }
  const { rowCount } = await pool.query(
    `SELECT 1 FROM ark_ai_attempts
     WHERE model = $1 AND created_at >= $2 AND prompt_tokens > 0 AND completion_tokens > 0`,
    [model, checkedAt],
  );
  assert.ok(rowCount >= 2, 'Expected token usage for both Ark requests');
  console.log('Ark returned valid English and Simplified Chinese JSON and recorded token usage.');
}

try {
  await main();
} catch (error) {
  const message = error instanceof assert.AssertionError ? error.message : 'Check the local database and migrations.';
  console.error('Ark smoke test failed. ' + message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
