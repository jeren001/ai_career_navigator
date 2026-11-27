import assert from 'node:assert/strict';
import { test } from 'node:test';
import { configuredAiProviders } from '../src/services/ai-providers.js';
import { generateAiJson } from '../src/services/ai-service.js';
import { OPENROUTER_DEFAULT_MODEL, OPENROUTER_FALLBACK_MODEL, reserveOpenRouterSpend } from '../src/services/ai-usage.js';

test('OpenRouter defaults to the verified model and requests a compatible route', async (t) => {
  const settings = {
    OPENROUTER_API_KEY: 'mock-key',
    OPENROUTER_MODEL: '',
    OPENROUTER_DAILY_REQUEST_LIMIT: '',
    OPENROUTER_FALLBACK_MODEL: '',
    OLLAMA_MODEL: 'local-demo',
    AI_PRIMARY_PROVIDER: '',
    AI_SECONDARY_PROVIDER: '',
    ARK_API_KEY: 'unused-key',
    ARK_MODEL: 'unused-model',
  };
  const previous = Object.fromEntries(Object.keys(settings).map((key) => [key, process.env[key]]));
  Object.assign(process.env, settings);
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const [provider, secondary] = configuredAiProviders();
  assert.equal(secondary.model, OPENROUTER_FALLBACK_MODEL);
  assert.notEqual(provider.cooldownKey, secondary.cooldownKey);
  assert.equal(provider.attemptLimit, 1);
  assert.equal(provider.id, 'openrouter');
  assert.equal(provider.model, OPENROUTER_DEFAULT_MODEL);
  const schema = { type: 'object', properties: { greeting: { type: 'string' } }, required: ['greeting'] };
  const usage = { prompt_tokens: 21, completion_tokens: 17, cost: 0 };
  const fetchMock = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url.href, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal(options.headers.authorization, 'Bearer mock-key');
    assert.equal(options.redirect, 'error');
    const request = JSON.parse(options.body);
    assert.equal(request.model, OPENROUTER_DEFAULT_MODEL);
    assert.equal(request.max_tokens, 64);
    assert.deepEqual(request.provider, { require_parameters: true, allow_fallbacks: false, max_price: { prompt: 0, completion: 0, request: 0 } });
    assert.deepEqual(request.reasoning, { enabled: false });
    assert.equal(request.response_format.type, 'json_schema');
    assert.deepEqual(request.response_format.json_schema.schema, schema);
    return Response.json({ choices: [{ message: { content: '{"greeting":"你好"}' } }], usage });
  });
  const request = { contents: 'Say hello in Chinese', systemInstruction: 'Return a JSON object', schema, maxOutputTokens: 64 };
  assert.deepEqual(await provider.generate(request), { text: '{"greeting":"你好"}', usage });

  const queries = [];
  const database = {
    async query(sql, values) {
      queries.push({ sql, values });
      return { rowCount: 1 };
    },
  };
  const reservation = await reserveOpenRouterSpend(provider.model, request, database);
  await reservation.settle(usage);
  assert.match(queries[0].sql, /INSERT INTO openrouter_ai_daily_usage/);
  assert.match(queries[0].sql, /request_count < \$5/);
  assert.equal(queries[0].values[4], 50);
  assert.deepEqual(queries[1].values.slice(1), [21, 17, 0]);

  process.env.OPENROUTER_DAILY_REQUEST_LIMIT = '0';
  assert.deepEqual(await generateAiJson({ ...request, cache: false }), { status: 'fallback', reason: 'spending_limit' });
  assert.equal(fetchMock.mock.callCount(), 1);
  process.env.OPENROUTER_MODEL = 'deepseek/paid-model';
  process.env.AI_SECONDARY_PROVIDER = 'ark';
  assert.deepEqual(configuredAiProviders().map(({ model }) => model), [OPENROUTER_FALLBACK_MODEL]);

  process.env.AI_PRIMARY_PROVIDER = 'ollama';
  process.env.AI_SECONDARY_PROVIDER = '';
  assert.deepEqual(configuredAiProviders().map(({ id }) => id), ['ollama']);
});

test('both free models draw from one PostgreSQL request budget', {
  skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1',
}, async () => {
  const { default: pool } = await import('../src/db/pool.js');
  const database = await pool.connect();
  const prior = process.env.OPENROUTER_DAILY_REQUEST_LIMIT;
  try {
    await database.query('BEGIN');
    await database.query(
      `INSERT INTO openrouter_ai_daily_usage (usage_date, request_count)
       VALUES ((clock_timestamp() AT TIME ZONE 'UTC')::date, 49)
       ON CONFLICT (usage_date) DO UPDATE SET request_count = 49`,
    );
    process.env.OPENROUTER_DAILY_REQUEST_LIMIT = '50';
    const request = { contents: 'synthetic SQL exercise', maxOutputTokens: 64 };
    const first = await reserveOpenRouterSpend(OPENROUTER_DEFAULT_MODEL, request, database);
    assert.equal(first.reason, undefined);
    assert.deepEqual(await reserveOpenRouterSpend(OPENROUTER_FALLBACK_MODEL, request, database),
      { reason: 'provider_daily_limit' });

    await first.cancel();
    const fallback = await reserveOpenRouterSpend(OPENROUTER_FALLBACK_MODEL, request, database);
    assert.equal(fallback.reason, undefined);
    await fallback.settle({ prompt_tokens: 15, completion_tokens: 10, cost: 0 });
    assert.deepEqual(await reserveOpenRouterSpend(OPENROUTER_DEFAULT_MODEL, request, database),
      { reason: 'provider_daily_limit' });
  } finally {
    if (prior === undefined) delete process.env.OPENROUTER_DAILY_REQUEST_LIMIT;
    else process.env.OPENROUTER_DAILY_REQUEST_LIMIT = prior;
    await database.query('ROLLBACK').finally(() => database.release());
    await pool.end();
  }
});
