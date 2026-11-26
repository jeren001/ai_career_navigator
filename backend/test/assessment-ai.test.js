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
