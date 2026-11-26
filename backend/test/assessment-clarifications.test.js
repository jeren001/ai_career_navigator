import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { prepareClarifications } from '../src/services/assessment-clarifications.js';
import { ASSESSMENT_SYSTEM_PROMPT, validateCustomEvidence } from '../src/services/assessment-prompts.js';
import { resetGeminiStateForTests, setGeminiClientForTests } from '../src/services/gemini.js';

const answers = [
  { question_id: 'q1', custom_answer: 'I volunteer at a repair cafe.' },
  { question_id: 'q2', option_id: 'q2-prototype' },
  { question_id: 'q5', option_id: 'q5-experience' },
  { question_id: 'q19', option_id: 'q19-changing' },
];
const generated = {
  questions: [
    { topic: 'past_example', variant: 0, source_id: 'q1', quote: 'I volunteer at a repair cafe' },
    { topic: 'weekly_time', variant: 1, source_id: 'q2', quote: 'Try a rough solution' },
    { topic: 'access_barrier', variant: 0, source_id: 'q5', quote: 'more accessible' },
    { topic: 'trial_criterion', variant: 1, source_id: 'q19', quote: 'Changing direction' },
  ],
  custom_evidence: [
    { question_id: 'q1', kind: 'experience', quote: 'I volunteer at a repair cafe' },
    { question_id: 'q2', kind: 'experience', quote: 'I am a licensed electrician' },
  ],
};

afterEach(resetGeminiStateForTests);

test('one structured request prepares four distinct grounded questions and quoted custom evidence', async () => {
  let reservations = 0;
  setGeminiClientForTests({ models: { async generateContent(request) {
    assert.equal(request.config.systemInstruction, ASSESSMENT_SYSTEM_PROMPT);
    assert.match(request.contents, /I volunteer at a repair cafe/);
    return { text: JSON.stringify(generated) };
  } } });
  const context = { userId: 1, answers, language: 'en', beforeRequest: async () => {
    reservations += 1;
    return true;
  } };
  const response = await prepareClarifications(context);
  assert.equal(response.status, 'ai');
  assert.equal(response.questions.length, 4);
  assert.equal(new Set(response.questions.map(({ dimension }) => dimension)).size, 4);
  assert.ok(response.questions.every(({ source }) => source === 'ai'));
  assert.match(response.questions[0].text, /repair cafe/);
  assert.deepEqual(response.custom_evidence, [generated.custom_evidence[0]]);
  assert.equal((await prepareClarifications(context)).cached, true);
  assert.equal(reservations, 1);
});

test('duplicate topics and fabricated context are replaced with predefined questions', async () => {
  const questions = structuredClone(generated.questions);
  questions[1].topic = 'past_example';
  questions[2].quote = 'I am a licensed electrician';
  setGeminiClientForTests({ models: { async generateContent() {
    return { text: JSON.stringify({ ...generated, questions }) };
  } } });
  const response = await prepareClarifications({ answers, language: 'en' });
  assert.deepEqual(response.questions.map(({ source }) => source), ['ai', 'fallback', 'fallback', 'ai']);
  assert.equal(new Set(response.questions.map(({ id }) => id)).size, 4);
  assert.ok(response.questions.every(({ text }) => !text.includes('electrician')));
});

test('quota exhaustion uses the four translated bank questions', async () => {
  setGeminiClientForTests({ models: { async generateContent() { assert.fail('Quota must block Gemini'); } } });
  const response = await prepareClarifications({ answers, language: 'zh-CN', beforeRequest: async () => false });
  assert.equal(response.reason, 'daily_limit');
  assert.equal(response.questions.length, 4);
  assert.ok(response.questions.every(({ text, source }) => source === 'fallback' && /\p{Script=Han}/u.test(text)));
});

test('a stated weekly time triggers a scheduling question in the fallback', async () => {
  const answer = { question_id: 'q1', custom_answer: 'I have three hours per week for design.' };
  const result = await prepareClarifications({ answers: [answer], language: 'en' });
  assert.match(result.questions[1].text, /fit the time you have available/);
  assert.equal(result.questions[1].options[0].label, 'One longer session');
});

test('custom evidence cannot omit an explicit negation', () => {
  const answers = [{ question_id: 'q1', custom_answer: 'I do not know how to write code.' }];
  const evidence = [
    { question_id: 'q1', kind: 'experience', quote: 'know how to write code' },
    { question_id: 'q1', kind: 'constraint', quote: 'I do not know how to write code' },
  ];
  assert.deepEqual(validateCustomEvidence(evidence, answers), [evidence[1]]);
});

test('similar reordered quotes are replaced and a stated budget prompts about low-cost options', async () => {
  const input = [
    { question_id: 'q1', custom_answer: 'I volunteer repairing laptops and phones.' },
    { question_id: 'q2', custom_answer: 'Repairing phones and laptops is my interest.' },
    { question_id: 'q5', custom_answer: 'I have no budget for tools.' },
    { question_id: 'q19', option_id: 'q19-changing' },
  ];
  const questions = [
    { topic: 'past_example', variant: 0, source_id: 'q1', quote: 'repairing laptops and phones' },
    { topic: 'weekly_time', variant: 1, source_id: 'q2', quote: 'Repairing phones and laptops' },
    { topic: 'access_barrier', variant: 0, source_id: 'q5', quote: 'no budget for tools' },
    { topic: 'trial_criterion', variant: 1, source_id: 'q19', quote: 'Changing direction' },
  ];
  setGeminiClientForTests({ models: { async generateContent() {
    return { text: JSON.stringify({ questions, custom_evidence: [] }) };
  } } });
  const result = await prepareClarifications({ answers: input, language: 'en' });
  assert.equal(result.questions[1].source, 'fallback');
  assert.match(result.questions[0].text, /like to apply this interest or skill/);
  assert.match(result.questions[2].text, /low-cost resource/);
});
