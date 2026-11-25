import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import {
  addEnrichment,
  enrichRecommendations,
  GEMINI_DEFAULT_MODEL,
  resetGeminiStateForTests,
  setGeminiClientForTests,
} from '../src/services/gemini.js';

const context = {
  answers: [{ question_id: 'q1', option_id: 'q1-analytical' }],
  traitScores: { analytics: 100, creativity: 10 },
  recommendations: {
    directions: [{ name: 'Technology & AI', match_percent: 100, score_basis: 'relative_to_top_direction' }],
    specializations: [],
    professions: [
      { slug: 'data-analyst', title: 'Data Analyst', match_percent: 100, score_basis: 'relative_to_top_profession' },
      { slug: 'ux-designer', title: 'UX Designer', match_percent: 80, score_basis: 'relative_to_top_profession' },
    ],
  },
};

const validResponse = {
  overview: 'Your evidence-first approach fits analytical roles.',
  strengths: ['Pattern recognition', 'Structured problem solving'],
  skills_to_develop: ['SQL practice', 'Communicating uncertainty'],
  roadmap: [
    { phase: 'Explore', action: 'Complete a small data exercise.', outcome: 'A short analysis.' },
    { phase: 'Practise', action: 'Build a dashboard from public data.', outcome: 'A portfolio example.' },
    { phase: 'Validate', action: 'Ask an analyst to review the project.', outcome: 'Specific improvement feedback.' },
  ],
  profession_explanations: [
    { slug: 'data-analyst', explanation: 'Your interest in evidence aligns with this role.' },
    { slug: 'ux-designer', explanation: 'Your secondary interest in users leaves this adjacent option open.' },
  ],
};

afterEach(() => {
  resetGeminiStateForTests();
});

test('Gemini enrichment preserves deterministic ordering and percentages', async () => {
  let request;
  setGeminiClientForTests({
    models: {
      async generateContent(value) {
        request = value;
        return { text: JSON.stringify(validResponse) };
      },
    },
  });

  const enriched = await enrichRecommendations(context);
  const result = addEnrichment(context.recommendations, enriched);

  assert.equal(request.model, GEMINI_DEFAULT_MODEL);
  assert.equal(request.config.maxOutputTokens, 600);
  assert.equal(request.config.responseMimeType, 'application/json');
  assert.equal(request.config.httpOptions.timeout, 15000);
  assert.equal(request.config.httpOptions.retryOptions.attempts, 1);
  assert.equal(enriched.status, 'ai');
  assert.deepEqual(result.professions.map((role) => role.slug), ['data-analyst', 'ux-designer']);
  assert.deepEqual(result.professions.map((role) => role.match_percent), [100, 80]);
  assert.equal(result.professions[0].ai_explanation, validResponse.profession_explanations[0].explanation);
  assert.equal(result.personalization.roadmap.length, 3);
});

test('Gemini fallback works when no API key is configured', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await enrichRecommendations(context);
    assert.deepEqual(result, { status: 'fallback', reason: 'not_configured' });
    assert.equal(addEnrichment(context.recommendations, result).personalization.status, 'fallback');
  } finally {
    if (previousKey !== undefined) process.env.GEMINI_API_KEY = previousKey;
  }
});

test('Gemini quota errors return fallback and invalid slugs are rejected', async () => {
  setGeminiClientForTests({
    models: {
      async generateContent() {
        const error = new Error('rate limited');
        error.status = 429;
        throw error;
      },
    },
  });
  assert.equal((await enrichRecommendations(context)).reason, 'quota_exceeded');

  resetGeminiStateForTests();
  setGeminiClientForTests({
    models: {
      async generateContent() {
        return {
          text: JSON.stringify({
            ...validResponse,
            profession_explanations: [{ slug: 'invented-role', explanation: 'Not in catalog.' }],
          }),
        };
      },
    },
  });
  assert.equal((await enrichRecommendations(context)).reason, 'invalid_response');
});

test('Gemini retries transient failures with bounded backoff', async () => {
  let calls = 0;
  setGeminiClientForTests({
    models: {
      async generateContent() {
        calls += 1;
        if (calls < 3) {
          const error = new Error('temporary capacity');
          error.status = 503;
          throw error;
        }
        return { text: JSON.stringify(validResponse) };
      },
    },
  });

  const result = await enrichRecommendations(context);
  assert.equal(result.status, 'ai');
  assert.equal(calls, 3);
});

test('Gemini classifies exhausted service and network failures for fallback', async () => {
  setGeminiClientForTests({
    models: {
      async generateContent() {
        const error = new Error('temporary capacity');
        error.status = 503;
        throw error;
      },
    },
  });
  assert.equal((await enrichRecommendations(context)).reason, 'service_unavailable');

  resetGeminiStateForTests();
  setGeminiClientForTests({
    models: {
      async generateContent() {
        throw new TypeError('fetch failed');
      },
    },
  });
  assert.equal((await enrichRecommendations(context)).reason, 'network_error');
});

test('Gemini caches duplicate profiles and applies request frequency limits', async () => {
  let calls = 0;
  setGeminiClientForTests({
    models: {
      async generateContent() {
        calls += 1;
        return { text: JSON.stringify(validResponse) };
      },
    },
  });

  assert.equal((await enrichRecommendations(context)).status, 'ai');
  assert.equal((await enrichRecommendations(context)).cached, true);
  assert.equal(calls, 1);

  const different = structuredClone(context);
  different.answers[0].note = 'different profile';
  assert.equal((await enrichRecommendations(different)).reason, 'rate_limited');
  assert.equal(calls, 1);
});

test('Gemini coalesces concurrent requests for the same assessment', async () => {
  let calls = 0;
  let resolveResponse;
  setGeminiClientForTests({
    models: {
      generateContent() {
        calls += 1;
        return new Promise((resolve) => {
          resolveResponse = () => resolve({ text: JSON.stringify(validResponse) });
        });
      },
    },
  });

  const first = enrichRecommendations(context);
  const second = enrichRecommendations(context);
  await Promise.resolve();
  assert.equal(calls, 1);

  resolveResponse();
  const [firstResult, secondResult] = await Promise.all([first, second]);
  assert.equal(firstResult.status, 'ai');
  assert.equal(secondResult.status, 'ai');
  assert.deepEqual(firstResult, secondResult);
});

test('daily allowance is reserved only for uncached model requests', async () => {
  let reservations = 0;
  let calls = 0;
  setGeminiClientForTests({
    models: {
      async generateContent() {
        calls += 1;
        return { text: JSON.stringify(validResponse) };
      },
    },
  });

  const request = { ...context, beforeRequest: async () => { reservations += 1; return true; } };
  assert.equal((await enrichRecommendations(request)).status, 'ai');
  assert.equal((await enrichRecommendations(request)).cached, true);
  assert.equal(reservations, 1);
  assert.equal(calls, 1);

  resetGeminiStateForTests();
  setGeminiClientForTests({ models: { async generateContent() { calls += 1; return { text: JSON.stringify(validResponse) }; } } });
  const limited = await enrichRecommendations({ ...context, beforeRequest: async () => false });
  assert.equal(limited.reason, 'daily_limit');
  assert.equal(calls, 1);
});

test('concurrent quota checks coalesce and process-limited requests leave daily usage alone', async () => {
  let reservations = 0;
  let allowRequest;
  let calls = 0;
  setGeminiClientForTests({
    models: {
      async generateContent() {
        calls += 1;
        return { text: JSON.stringify(validResponse) };
      },
    },
  });
  const request = {
    ...context,
    userId: 1,
    beforeRequest() {
      reservations += 1;
      return new Promise((resolve) => { allowRequest = resolve; });
    },
  };
  const first = enrichRecommendations(request);
  const second = enrichRecommendations(request);
  assert.equal((await enrichRecommendations({ ...request, userId: 2 })).reason, 'rate_limited');
  assert.equal(reservations, 1);
  allowRequest(true);
  assert.deepEqual(await first, await second);
  assert.equal(calls, 1);
});

test('the rolling process quota includes retries', async (t) => {
  let now = Date.now();
  let calls = 0;
  t.mock.method(Date, 'now', () => now);
  setGeminiClientForTests({
    models: {
      async generateContent() {
        calls += 1;
        throw Object.assign(new Error('temporary capacity'), { status: 503 });
      },
    },
  });

  for (let userId = 1; userId <= 5; userId += 1) {
    const result = await enrichRecommendations({ ...context, userId });
    assert.equal(result.reason, userId < 4 ? 'service_unavailable' : 'rate_limited');
    now += 3_100;
  }
  assert.equal(calls, 10);
});
