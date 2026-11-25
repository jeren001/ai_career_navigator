import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createApp } from '../src/app.js';
import { clearAssessmentSessions } from '../src/routes/assessment.js';
import { collectSignals, QUESTIONS, selectNextQuestion } from '../src/services/assessment.js';

const roles = [
  {
    id: 1,
    slug: 'data-analyst',
    title: 'Data Analyst',
    cluster: 'Tech & Data',
    summary: 'Turns data into useful decisions.',
    tags: ['analytics', 'sql', 'statistics', 'structure'],
    niche_pivot_friendly: true,
    is_active: true,
    market_pulse: {
      career_field: 'Technology & AI',
      specializations: ['Product analytics'],
    },
  },
  {
    id: 2,
    slug: 'ux-designer',
    title: 'UX Designer',
    cluster: 'Design & Creative',
    summary: 'Designs useful user experiences.',
    tags: ['creativity', 'user-experience', 'visual-design', 'people'],
    niche_pivot_friendly: true,
    is_active: true,
    market_pulse: {
      career_field: 'Art & Design',
      specializations: ['Interaction design'],
    },
  },
  {
    id: 3,
    slug: 'career-counselor',
    title: 'Career Counselor',
    cluster: 'People & Psychology/Education',
    summary: 'Helps people make career decisions.',
    tags: ['people', 'communication', 'interviewing'],
    niche_pivot_friendly: false,
    is_active: true,
    market_pulse: {
      career_field: 'People & Psychology/Education',
      specializations: ['Career guidance'],
    },
  },
];

let sessionId;
let guestToken;
let server;
let baseUrl;
let nextSessionId = 42;
let guestInsertError;
const database = {
  async query(query, values = []) {
    if (query.startsWith('SELECT id, is_guest FROM users')) return { rows: [{ id: values[0], is_guest: true }] };
    if (query.startsWith('SELECT id FROM users')) return { rows: values[0] === 7 ? [{ id: 7 }] : [] };
    if (query.startsWith('INSERT INTO ai_usage_daily')) return { rows: [{ request_count: 1, request_limit: 1 }] };
    if (query.includes('FROM users WHERE id = $1')) return { rows: [{ id: values[0], is_guest: true, interests: [], skills: [] }] };
    if (query.includes('FROM quiz_sessions WHERE user_id = $1')) return { rows: [] };
    if (query.startsWith('SELECT * FROM career_roles')) return { rows: roles };
    if (query.startsWith('INSERT INTO quiz_sessions')) return { rows: [{ id: nextSessionId++, completed_at: '2026-11-24T00:00:00.000Z' }] };
    if (query.startsWith('INSERT INTO users')) {
      if (guestInsertError) throw guestInsertError;
      return { rows: [{ id: 7 }] };
    }
    throw new Error(`Unexpected query: ${query}`);
  },
};

before(async () => {
  clearAssessmentSessions();
  server = createApp(database).listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  clearAssessmentSessions();
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('assessment starts with a general question', async () => {
  const response = await fetch(`${baseUrl}/api/assessment/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  const result = await response.json();
  sessionId = result.assessment_id;
  guestToken = result.access_token;

  assert.equal(response.status, 201);
  assert.equal(result.user_id, 7);
  assert.equal(typeof guestToken, 'string');
  assert.equal(result.question.id, 'q1');
  assert.equal(result.question.allows_custom_answer, true);
  assert.equal(result.stage, 'general');
  assert.equal(result.question.options[0].weights, undefined);
  assert.deepEqual(result.progress, { answered: 0, target: 18 });
});

test('optional notes add rule-based hobby and skill signals', () => {
  const signals = collectSignals([
    { question_id: 'q1', option_id: 'q1-analytical', note: 'I love photography and drawing' },
  ]);

  assert.equal(signals.tags.creativity, 2);
  assert.equal(signals.tags['visual-design'], 2);
});

test('assessment start reports an outdated database schema as unavailable', async () => {
  guestInsertError = Object.assign(new Error('column is_guest does not exist'), { code: '42703' });
  try {
    const response = await fetch(`${baseUrl}/api/assessment/start`, { method: 'POST' });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: 'Assessment database schema is out of date' });
  } finally {
    guestInsertError = undefined;
  }
});

test('adaptive selection uses general answers before focusing on a signal', () => {
  const generalAnswers = [
    { question_id: 'q1', option_id: 'q1-building' },
    { question_id: 'q2', option_id: 'q2-break-down' },
    { question_id: 'q3', option_id: 'q3-deep-focus' },
    { question_id: 'q4', option_id: 'q4-clear' },
    { question_id: 'q5', option_id: 'q5-insight' },
    { question_id: 'q19', option_id: 'q19-exploring' },
  ];
  const next = selectNextQuestion(generalAnswers);

  assert.notEqual(next.id, 'q1');
  assert.ok(next.focus.includes('analytics') || next.focus.includes('coding') || next.focus.includes('structure'));
});

test('weighted scoring keeps non-leading fields available', async () => {
  const answers = QUESTIONS.slice(0, 15).map((question) => ({
    question_id: question.id,
    option_id: question.options[0].id,
  }));
  const response = await fetch(`${baseUrl}/api/quiz/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.ok(result.directions.length >= 2);
  assert.ok(result.professions.every((profession) => profession.match_percent >= 1 && profession.match_percent <= 100));
  assert.deepEqual(
    result.professions.map((profession) => profession.match_percent),
    [...result.professions.map((profession) => profession.match_percent)].sort((left, right) => right - left),
  );
});

test('assessment rejects an answer for a question that is not current', async () => {
  const response = await fetch(`${baseUrl}/api/assessment/answer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${guestToken}` },
    body: JSON.stringify({ assessment_id: sessionId, question_id: 'q6', option_id: 'q6-query' }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: 'question_id is not the current assessment question' });
});

test('assessment adapts after general answers and completes with three recommendation levels', async () => {
  let question = QUESTIONS[0];
  let result;
  const ids = new Set();
  const stages = { general: 1, adaptive: 0, clarification: 0 };
  for (let index = 0; index < 18; index += 1) {
    ids.add(question.id);
    const answer = index === 0 ? { custom_answer: 'I enjoy photography.' } : { option_id: question.options[0].id };
    const response = await fetch(`${baseUrl}/api/assessment/answer`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${guestToken}` },
      body: JSON.stringify({ assessment_id: sessionId, question_id: question.id, ...answer }),
    });
    result = await response.json();
    assert.equal(response.status, 200);
    if (index < 17) {
      assert.equal(result.complete, false);
      question = result.question;
      stages[result.stage] += 1;
      if (result.stage === 'clarification') assert.equal(question.source, 'fallback');
    }
  }

  assert.equal(result.complete, true);
  assert.equal(ids.size, 18);
  assert.ok(!(ids.has('q12') && ids.has('q15')));
  assert.ok(!ids.has('q13') && !ids.has('q17'));
  assert.deepEqual(stages, { general: 6, adaptive: 8, clarification: 4 });
  assert.deepEqual(result.result.clarifications, { status: 'fallback', ai_questions: 0, reason: 'not_configured' });
  assert.deepEqual(result.result.custom_analysis, [{
    question_id: 'q1', source: 'fallback', evidence: null, scoring_keywords: ['creativity', 'visual-design'],
  }]);
  assert.equal(result.result.user_id, 7);
  assert.equal(typeof result.result.trait_scores.analytics, 'number');
  assert.ok(result.result.directions.length > 0);
  assert.ok(result.result.specializations.length > 0);
  assert.ok(result.result.professions.length > 0);
  assert.equal(result.result.professions[0].reason.endsWith('.'), true);
});

test('Simplified Chinese questions keep their stable option IDs and custom answers are exclusive', async () => {
  const response = await fetch(`${baseUrl}/api/assessment/start`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ language: 'zh-CN' }),
  });
  const start = await response.json();
  assert.equal(start.language, 'zh-CN');
  assert.match(start.question.text, /\p{Script=Han}/u);
  assert.equal(start.question.options[0].id, 'q1-analytical');
  const invalid = await fetch(`${baseUrl}/api/assessment/answer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${start.access_token}` },
    body: JSON.stringify({ assessment_id: start.assessment_id, question_id: 'q1', custom_answer: '数据分析', option_id: 'q1-analytical' }),
  });
  assert.equal(invalid.status, 400);
  const answer = await fetch(`${baseUrl}/api/assessment/answer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${start.access_token}` },
    body: JSON.stringify({ assessment_id: start.assessment_id, question_id: 'q1', custom_answer: '数据分析' }),
  });
  const next = await answer.json();
  assert.equal(answer.status, 200);
  assert.equal(next.progress.answered, 1);
  assert.match(next.question.text, /\p{Script=Han}/u);
});

test('custom text supplies capped keyword signals and skips explicit negation', () => {
  const answers = [
    { question_id: 'q1', custom_answer: '我喜欢数据分析。我不喜欢编程。' },
    { question_id: 'q2', custom_answer: 'I enjoy photography and photography and writing.' },
  ];
  assert.deepEqual(collectSignals(answers), {
    fields: {},
    tags: { analytics: 1, data: 1, creativity: 1, 'visual-design': 1, writing: 1 },
  });
});

test('quiz evaluate validates answers and persists a completed result', async () => {
  const answers = QUESTIONS.slice(0, 15).map((question) => ({
    question_id: question.id,
    option_id: question.options[0].id,
  }));
  const response = await fetch(`${baseUrl}/api/quiz/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
  const result = await response.json();

  assert.equal(response.status, 201);
  assert.equal(typeof result.session_id, 'number');
  assert.equal(result.professions[0].slug, 'data-analyst');
});

test('quiz evaluate rejects malformed answers', async () => {
  const response = await fetch(`${baseUrl}/api/quiz/evaluate`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ user_id: 7, answers: [{ question_id: 'q1', option_id: 'wrong' }] }),
  });

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /between 15 and 18/);
});
