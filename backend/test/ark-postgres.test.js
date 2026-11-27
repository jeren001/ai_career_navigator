import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import pool from '../src/db/pool.js';
import { generateAiJson, resetGeminiStateForTests, setGeminiClientForTests } from '../src/services/ai-service.js';
import { reserveArkSpend } from '../src/services/ai-usage.js';

after(() => pool.end());

test('Ark enforces its shared spend limit, stores usage, and fails over', {
  skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1',
}, async (t) => {
  const env = {
    ARK_MODEL: 'ark-test-' + randomUUID(),
    ARK_API_KEY: 'mock-key',
    ARK_BASE_URL: 'https://ark.example.test/api/v3',
    ARK_INPUT_COST_MICROS_PER_MILLION: '1000000',
    ARK_OUTPUT_COST_MICROS_PER_MILLION: '1000000',
    ARK_DAILY_SPEND_LIMIT_MICROS: '100000',
    AI_PRIMARY_PROVIDER: 'ark',
    AI_SECONDARY_PROVIDER: 'none',
    AI_MIN_REQUEST_INTERVAL_MS: '0',
    AI_ATTEMPT_TIMEOUT_MS: '100',
  };
  const prior = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    resetGeminiStateForTests();
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const database = await pool.connect();
  try {
    await database.query('BEGIN');
    // Isolate the cap check from previous activity on the disposable test database.
    await database.query(`UPDATE ark_ai_daily_usage SET accounted_cost_micros = 0
       WHERE usage_date = (clock_timestamp() AT TIME ZONE 'UTC')::date`);
    process.env.ARK_DAILY_SPEND_LIMIT_MICROS = '400';
    const budget = await reserveArkSpend(env.ARK_MODEL, { maxOutputTokens: 5 }, database);
    assert.equal(budget.reason, undefined);
    const denied = await reserveArkSpend(env.ARK_MODEL, { maxOutputTokens: 5 }, database);
    assert.equal(denied.reason, 'spending_limit');
    await budget.cancel();
    const released = await reserveArkSpend(env.ARK_MODEL, { maxOutputTokens: 5 }, database);
    assert.equal(released.reason, undefined);
    process.env.ARK_DAILY_SPEND_LIMIT_MICROS = env.ARK_DAILY_SPEND_LIMIT_MICROS;
    const text = '你好';
    const schema = { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] };
    let calls = 0;
    let timedOut;
    t.mock.method(globalThis, 'fetch', async (url, options) => {
      calls += 1;
      assert.equal(url.href, 'https://ark.example.test/api/v3/chat/completions');
      assert.equal(options.headers.authorization, 'Bearer mock-key');
      const request = JSON.parse(options.body);
      assert.equal(request.model, env.ARK_MODEL);
      assert.deepEqual(request.response_format, { type: 'json_object' });
      assert.deepEqual(request.thinking, { type: 'disabled' });
      assert.equal(request.max_tokens, 64);
      assert.ok(request.messages[0].content.includes(JSON.stringify(schema)));
      if (request.messages[1].content === 'timeout') {
        options.signal.addEventListener('abort', () => { timedOut = true; });
        return new Promise(() => {});
      }
      return Response.json({
        usage: { prompt_tokens: 18, completion_tokens: 6 },
        choices: [{ message: { content: JSON.stringify({ text }) } }],
      });
    });
    const request = {
      userId: 42, contents: '用中文问好', systemInstruction: 'Return JSON', schema, maxOutputTokens: 64,
      maxAttempts: 1, validate: (result) => result?.text === text ? result : undefined,
    };
    await database.query('ROLLBACK');
    const result = await generateAiJson(request);
    assert.equal(result.provider, 'ark');
    assert.equal(result.text, text);
    assert.equal((await generateAiJson(request)).cached, true);
    const { rows } = await database.query(
      `SELECT prompt_tokens, completion_tokens, actual_cost_micros FROM ark_ai_attempts
       WHERE model = $1 ORDER BY created_at DESC LIMIT 1`, [env.ARK_MODEL],
    );
    assert.deepEqual(rows[0], { prompt_tokens: '18', completion_tokens: '6', actual_cost_micros: '24' });
    assert.equal((await generateAiJson({ ...request, contents: 'timeout' })).reason, 'timeout');
    assert.equal(timedOut, true);

    process.env.ARK_DAILY_SPEND_LIMIT_MICROS = '0';
    let quotaCalls = 0;
    assert.equal((await generateAiJson({
      ...request, contents: 'blocked', beforeRequest() { quotaCalls += 1; return true; },
    })).reason, 'spending_limit');
    assert.equal(quotaCalls, 0);
    process.env.AI_SECONDARY_PROVIDER = 'gemini';
    setGeminiClientForTests({ models: { async generateContent() { return { text: JSON.stringify({ text }) }; } } });
    assert.equal((await generateAiJson({ ...request, contents: 'fallback', maxAttempts: 2 })).provider, 'gemini');
    assert.equal(calls, 2);
  } finally {
    try {
      await database.query('ROLLBACK');
      await database.query(
        `WITH removed AS (
           DELETE FROM ark_ai_attempts WHERE model = $1
           RETURNING usage_date, COALESCE(actual_cost_micros, reserved_cost_micros) AS cost
         ), costs AS (
           SELECT usage_date, SUM(cost) AS cost FROM removed GROUP BY usage_date
         )
         UPDATE ark_ai_daily_usage AS daily
         SET accounted_cost_micros = daily.accounted_cost_micros - costs.cost
         FROM costs WHERE daily.usage_date = costs.usage_date`,
        [env.ARK_MODEL],
      );
    } finally {
      database.release();
    }
  }
});
