import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';

test('challenge discovery, submission, evaluation and My Skills work against PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1' }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, guest] } = await database.query(
        'INSERT INTO users (is_guest) VALUES (false), (false), (true) RETURNING id, is_guest',
      );
      const tokens = [owner, other, guest].map(createAccessToken);
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${server.address().port}`;
      async function request(path, { method = 'GET', identity, body } = {}) {
        const result = await fetch(origin + path, {
          method,
          headers: {
            ...(identity !== undefined && { authorization: `Bearer ${tokens[identity]}` }),
            ...(body && { 'content-type': 'application/json' }),
          },
          body: body && JSON.stringify(body),
        });
        return { status: result.status, data: await result.json() };
      }

      const spec = await request('/api-docs/openapi.json');
      assert.equal(spec.status, 200);
      assert.deepEqual(spec.data.paths['/api/challenges/submissions/{id}/evaluate'].post.security, [{ bearerAuth: [] }]);
      assert.equal((await request('/api/challenges')).data.challenges.length, 100);
      assert.equal((await request('/api/learning/resources')).data.resources.length, 169);
      const match = await request('/api/challenges?skill=SQL&profession_slug=database-administrator&language=zh-CN');
      const challenge = match.data.challenges.find(({ id }) => id === 'sc-ta-query-library');
      assert.match(challenge.title, /\p{Script=Han}/u);
      const detail = await request(`/api/challenges/${challenge.id}?language=zh-CN`);
      assert.equal(detail.data.challenge.rubric.max_points, 3);
      assert.match(detail.data.rubric_interpretation, /\p{Script=Han}/u);

      const submitPath = `/api/challenges/${challenge.id}/submissions`;
      const artifact = '东馆 2\n西馆 1\n北馆 0';
      const body = { artifact, language: 'zh-CN' };
      const submit = (identity, input = body) => request(submitPath, { method: 'POST', identity, body: input });
      assert.equal((await submit(undefined)).status, 401);
      assert.equal((await submit(2)).status, 401);
      assert.equal((await submit(0, { ...body, points: 3 })).status, 400);
      assert.equal((await request('/api/skills', { method: 'POST', identity: 0, body: { name: 'SQL', self_assessed_level: 2 } })).status, 201);
      const saved = await submit(0);
      assert.equal(saved.status, 201);
      const { id } = saved.data.submission;
      assert.equal(saved.data.submission.status, 'submitted');
      const path = `/api/challenges/submissions/${id}`;
      const evaluate = (identity = 0) => request(`${path}/evaluate`, { method: 'POST', identity });
      assert.equal((await request(path, { identity: 1 })).status, 404);
      assert.equal((await evaluate(1)).status, 404);

      setAiProvidersForTests([]);
      const unavailable = (await evaluate()).data.submission;
      assert.equal(unavailable.status, 'unavailable');
      assert.deepEqual(unavailable.evaluation, { status: 'unavailable', scope: 'practice_artifact', reason: 'not_configured' });
      assert.equal(unavailable.artifact, artifact);

      let providerCalls = 0;
      let releaseEvaluation;
      let startEvaluation;
      const started = new Promise((resolve) => { startEvaluation = resolve; });
      const release = new Promise((resolve) => { releaseEvaluation = resolve; });
      setAiProvidersForTests([{
        id: 'gemini', model: 'fixture',
        async generate({ contents }) {
          providerCalls += 1;
          startEvaluation();
          await release;
          const input = JSON.parse(contents.split('\n').at(-1));
          return JSON.stringify({
            points: 999,
            criteria: input.criteria.map(({ id }, index) => ({
              id, met: index !== 2, evidence: index === 2 ? '' : '东馆 2', feedback: '请补充支持结论的查询。',
            })),
          });
        },
      }]);
      const firstEvaluation = evaluate();
      const contention = await Promise.race([started.then(() => evaluate()), firstEvaluation]);
      releaseEvaluation();
      assert.equal(contention.status, 202);
      assert.equal(contention.data.submission.status, 'evaluating');
      const graded = (await firstEvaluation).data.submission;
      assert.equal(graded.status, 'evaluated');
      assert.equal(graded.evaluation.provider, 'gemini');
      assert.deepEqual([graded.evaluation.points, graded.evaluation.max_points], [2, 3]);
      assert.equal((await evaluate()).data.submission.evaluation.points, 2);
      assert.equal(providerCalls, 1);
      const progress = (await request('/api/challenges/progress', { identity: 0 })).data.progress;
      assert.deepEqual([progress[0].submitted_count, progress[0].evaluated_count, progress[0].latest_submission_id], [1, 1, id]);
      assert.deepEqual((await request('/api/challenges/progress', { identity: 1 })).data.progress, []);
      const [skill] = (await request('/api/skills', { identity: 0 })).data.skills;
      assert.equal(skill.practical_assessment, null);
      assert.equal(skill.self_assessment.level, 2);
      assert.deepEqual(skill.challenge_practice, { submitted_count: 1, evaluated_count: 1, latest_submission_id: id });
      const usage = await database.query('SELECT request_count FROM ai_usage_daily WHERE user_id = $1', [owner.id]);
      assert.equal(usage.rows[0].request_count, 1);

      resetGeminiStateForTests();
      setAiProvidersForTests([{
        id: 'gemini',
        async generate() {
          return JSON.stringify({ criteria: challenge.rubric.criteria.map(({ id }) => ({
            id, met: true, evidence: 'fabricated evidence', feedback: '缺少证据。',
          })) });
        },
      }]);
      const next = (await submit(0)).data.submission;
      const rejected = await request(`/api/challenges/submissions/${next.id}/evaluate`, { method: 'POST', identity: 0 });
      assert.equal(rejected.data.submission.evaluation.reason, 'invalid_response');

      setAiProvidersForTests([]);
      const careers = await request('/api/careers');
      assert.ok(careers.data.length >= 250);
      const startedAssessment = await request('/api/assessment/start', {
        method: 'POST', identity: 0, body: { language: 'zh-CN' },
      });
      assert.equal(startedAssessment.status, 201);
      const assessmentId = startedAssessment.data.assessment_id;
      const questionIds = [];
      let step = startedAssessment.data;
      for (let index = 0; index < 18; index += 1) {
        questionIds.push(step.question.id);
        assert.match(step.question.text, /\p{Script=Han}/u);
        const answer = await request('/api/assessment/answer', {
          method: 'POST',
          identity: 0,
          body: { assessment_id: assessmentId, question_id: step.question.id, option_id: step.question.options[0].id },
        });
        assert.equal(answer.status, 200);
        step = answer.data;
      }
      assert.equal(step.complete, true);
      assert.equal(new Set(questionIds).size, 18);
      assert.ok(questionIds.slice(6, 14).every((id) => id.startsWith('bank-')));
      assert.equal(step.result.clarifications.status, 'fallback');
      const persisted = await database.query('SELECT answers FROM quiz_sessions WHERE id = $1 AND user_id = $2', [
        step.result.session_id, owner.id,
      ]);
      assert.deepEqual(persisted.rows[0].answers.map(({ question_id }) => question_id), questionIds);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
