import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { afterEach, test } from 'node:test';
import {
  generateAssessmentJson,
  resetGeminiStateForTests,
  setAiProvidersForTests,
  setGeminiClientForTests,
} from '../src/services/assessment-ai.js';

const schema = { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'] };
const request = {
  userId: 7,
  contents: 'Assessment input',
  schema,
  maxOutputTokens: 150,
  validate: (value) => typeof value?.answer === 'string' ? value : undefined,
};

const unavailable = () => { throw Object.assign(new Error('Service unavailable'), { status: 503 }); };

afterEach(resetGeminiStateForTests);

test('a guest phase can use its second attempt for automatic failover to a local Ollama adapter', async (t) => {
  const prior = Object.fromEntries(['AI_SECONDARY_PROVIDER', 'OLLAMA_MODEL', 'OLLAMA_BASE_URL']
    .map((key) => [key, process.env[key]]));
  let received;
  const server = createServer(async (incoming, response) => {
    let body = '';
    for await (const chunk of incoming) body += chunk;
    received = { path: incoming.url, body: JSON.parse(body) };
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ message: { content: '{"answer":"secondary"}' } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await new Promise((resolve) => server.close(resolve));
  });
  process.env.AI_SECONDARY_PROVIDER = 'ollama';
  process.env.OLLAMA_MODEL = 'test-model';
  process.env.OLLAMA_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  setGeminiClientForTests({ models: { generateContent: unavailable } });

  let reservations = 0;
  const result = await generateAssessmentJson({
    ...request, maxAttempts: 2, beforeRequest: async () => ++reservations <= 2,
  });
  assert.equal(result.provider, 'ollama');
  assert.equal(result.answer, 'secondary');
  assert.equal(reservations, 2);
  assert.equal(received.path, '/api/chat');
  assert.equal(received.body.model, 'test-model');
  assert.deepEqual(received.body.format, schema);
  assert.equal(received.body.options.num_predict, 150);
  assert.equal(received.body.messages[0].role, 'system');
  assert.equal((await generateAssessmentJson(request)).cached, true);
});

test('rate limiting cools down its provider and the secondary can answer a new request', async (t) => {
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  let primaryCalls = 0;
  setAiProvidersForTests([
    { id: 'primary', async generate() {
      primaryCalls += 1;
      throw Object.assign(new Error('Rate limited'), { status: 429, retryAfter: '30' });
    } },
    { id: 'secondary', async generate() { return '{"answer":"secondary"}'; } },
  ]);

  assert.equal((await generateAssessmentJson(request)).provider, 'secondary');
  now += 3_100;
  assert.equal((await generateAssessmentJson({ ...request, contents: 'Different input' })).provider, 'secondary');
  assert.equal(primaryCalls, 1);
});

test('a timeout aborts a provider and returns deterministic fallback within the task deadline', async () => {
  let signal;
  setAiProvidersForTests([{ id: 'slow', generate(options) {
    signal = options.signal;
    return new Promise(() => {});
  } }]);
  const result = await generateAssessmentJson({ ...request, taskTimeoutMs: 30 });
  assert.equal(result.reason, 'timeout');
  assert.equal(signal.aborted, true);
});

test('a follow-up waits for process spacing and reserves a new attempt', async (t) => {
  let reservations = 0;
  setAiProvidersForTests([{ id: 'primary', async generate() { return '{"answer":"ok"}'; } }]);

  // Move the clock forward after the first call to test the small gap at the boundary.
  const clock = Date.now;
  let offset = 0;
  t.mock.method(Date, 'now', () => clock() + offset);
  const beforeRequest = async () => ++reservations <= 2;
  assert.equal((await generateAssessmentJson({ ...request, beforeRequest })).status, 'ai');
  offset = 2_970;
  assert.equal((await generateAssessmentJson({
    ...request, contents: 'Final assessment', waitForSlot: true, beforeRequest,
  })).status, 'ai');
  assert.equal(reservations, 2);
});

test('one allowed attempt uses the primary and configured process limits still apply', async (t) => {
  const prior = Object.fromEntries(['AI_MAX_ATTEMPTS_PER_MINUTE', 'AI_MIN_REQUEST_INTERVAL_MS']
    .map((key) => [key, process.env[key]]));
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.AI_MAX_ATTEMPTS_PER_MINUTE = '1';
  process.env.AI_MIN_REQUEST_INTERVAL_MS = '0';
  const calls = [];
  setAiProvidersForTests(['primary', 'secondary'].map((id) => ({
    id,
    async generate() {
      calls.push(id);
      return '{"answer":"ok"}';
    },
  })));
  assert.equal((await generateAssessmentJson({ ...request, maxAttempts: 1 })).provider, 'primary');
  assert.equal((await generateAssessmentJson(request)).cached, true);
  assert.equal((await generateAssessmentJson({ ...request, contents: 'Another request' })).reason, 'rate_limited');
  assert.deepEqual(calls, ['primary']);
});

test('OpenAI-compatible configuration uses custom routing, validation, caching, and failover', async (t) => {
  const env = {
    AI_PRIMARY_PROVIDER: 'openai-compatible',
    AI_SECONDARY_PROVIDER: 'gemini',
    AI_OPENAI_COMPATIBLE_BASE_URL: 'http://127.0.0.1:8000/custom/v1/',
    AI_OPENAI_COMPATIBLE_MODEL: 'test-model',
    AI_OPENAI_COMPATIBLE_API_KEY: 'test-fixture',
    AI_MIN_REQUEST_INTERVAL_MS: '0',
  };
  const prior = Object.fromEntries(Object.keys(env).map((key) => [key, process.env[key]]));
  Object.assign(process.env, env);
  t.after(() => {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  const received = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    received.push({ url: url.href, options });
    if (received.length === 3) return new Response(null, { status: 429, headers: { 'retry-after': '30' } });
    return Response.json({ choices: [{ message: { content: '{"answer":"validated"}' } }] });
  });
  setGeminiClientForTests({
    models: { async generateContent() { return { text: '{"answer":"fallback provider"}' }; } },
  });
  let reservations = 0;
  const aiRequest = { ...request, beforeRequest: async () => ++reservations <= 4 };

  const result = await generateAssessmentJson(aiRequest);
  assert.equal(result.provider, 'openai-compatible');
  assert.equal(result.answer, 'validated');
  const [{ url, options }] = received;
  assert.equal(url, 'http://127.0.0.1:8000/custom/v1/chat/completions');
  assert.equal(options.headers.authorization, 'Bearer test-fixture');
  assert.equal(options.redirect, 'error');
  assert.ok(options.signal instanceof AbortSignal);
  const payload = JSON.parse(options.body);
  assert.equal(payload.model, 'test-model');
  assert.equal(payload.max_completion_tokens, request.maxOutputTokens);
  assert.deepEqual(payload.messages.map(({ role }) => role), ['system', 'user']);
  assert.equal(payload.messages[1].content, request.contents);
  assert.equal(payload.response_format.type, 'json_schema');
  assert.deepEqual(payload.response_format.json_schema.schema, schema);
  assert.equal((await generateAssessmentJson(aiRequest)).cached, true);
  assert.equal(reservations, 1);

  process.env.AI_OPENAI_COMPATIBLE_MODEL = 'other-model';
  assert.equal((await generateAssessmentJson(aiRequest)).cached, false);
  const fallback = await generateAssessmentJson({ ...aiRequest, contents: 'Follow-up' });
  assert.equal(fallback.provider, 'gemini');
  assert.equal(fallback.answer, 'fallback provider');
  assert.equal(reservations, 4);
  assert.equal(received.length, 3);
});
