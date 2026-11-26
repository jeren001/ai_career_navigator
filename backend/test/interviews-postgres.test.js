import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';

test('interview ownership, saved progress, grounded feedback and retries work against PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 20000 }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: identities } = await database.query(
        'INSERT INTO users (is_guest) VALUES (false), (false), (true) RETURNING id, is_guest',
      );
      const tokens = identities.map(createAccessToken);
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${server.address().port}`;
      async function request(path, { identity = 0, method = 'GET', body } = {}) {
        const result = await fetch(origin + path, {
          method,
          headers: {
            ...(tokens[identity] && { authorization: `Bearer ${tokens[identity]}` }),
            ...(body && { 'content-type': 'application/json' }),
          },
          body: body && JSON.stringify(body),
        });
        return { status: result.status, data: await result.json() };
      }

      const base = '/api/interviews';
      const spec = await request('/api-docs/openapi.json');
      assert.equal(spec.status, 200);
      assert.deepEqual(spec.data.paths[`${base}/{id}/evaluate`].post.security, [{ bearerAuth: [] }]);
      assert.equal((await fetch(origin + '/api-docs/')).status, 200);
      const settings = { profession_slug: 'backend-engineer', difficulty: 'beginner', language: 'zh-CN' };
      const start = (body = settings, identity = 0) => request(base, { method: 'POST', identity, body });
      assert.equal((await start(settings, 2)).status, 401);
      assert.equal((await start(settings, 3)).status, 401);
      assert.equal((await start({ ...settings, difficulty: 'unknown' })).status, 400);
      assert.equal((await start({ ...settings, language: 'fr' })).status, 400);
      assert.equal((await start({ ...settings, profession_slug: 'unknown-career' })).status, 404);
      const created = await start();
      assert.equal(created.status, 201);
      let { session } = created.data;
      const path = `${base}/${session.id}`;
      const evaluate = (identity = 0) => request(`${path}/evaluate`, { method: 'POST', identity });
      const submit = (question_id, answer) => request(`${path}/answers`, { method: 'POST', body: { question_id, answer } });
      assert.equal(session.profession.slug, settings.profession_slug);
      assert.equal(session.difficulty, settings.difficulty);
      assert.equal(session.language, settings.language);
      assert.match(session.current_question.text, /\p{Script=Han}/u);
      assert.equal(session.current_question.relevance, 'profession');
      assert.deepEqual(session.progress, { answered: 0, total: 6 });
      assert.equal((await request(path, { identity: 1 })).status, 404);
      assert.equal((await evaluate(1)).status, 404);
      assert.equal((await evaluate()).status, 409);
      assert.equal((await submit('out-of-order-id', '提交内容')).status, 409);

      let calls = 0;
      setAiProvidersForTests([{
        id: 'gemini', model: 'interview-fixture',
        async generate({ contents }) {
          calls += 1;
          const input = JSON.parse(contents.split('\n').at(-1));
          assert.ok(input.answer.includes('重复请求'));
          return JSON.stringify({ choice: 1, quote: '重复请求' });
        },
      }]);
      const first = session.current_question.id;
      const followUp = await submit(first, '我用重复请求检查了结果。');
      assert.equal(followUp.status, 200);
      session = followUp.data.session;
      assert.equal(session.current_question.source, 'ai');
      assert.match(session.current_question.text, /你提到“重复请求”/u);
      assert.equal((await submit(first, '重复提交')).status, 409);
      assert.equal(calls, 1);

      setAiProvidersForTests([]);
      while (session.current_question) {
        const next = await submit(session.current_question.id, '我记录了结果。');
        assert.equal(next.status, 200);
        session = next.data.session;
      }
      assert.equal(session.status, 'completed');
      assert.equal(session.transcript.length, 6);
      assert.equal(session.transcript.filter(({ question }) => question.source === 'fallback').length, 2);
      const noProvider = (await evaluate()).data.session;
      assert.equal(noProvider.evaluation_status, 'unavailable');
      assert.deepEqual(noProvider.evaluation, { status: 'unavailable', reason: 'not_configured', scope: 'practice_interview' });
      assert.equal(noProvider.score, null);
      assert.deepEqual(noProvider.transcript, session.transcript);

      resetGeminiStateForTests();
      setAiProvidersForTests([{
        id: 'gemini', model: 'invalid-interview-fixture',
        async generate({ contents }) {
          const { rounds } = JSON.parse(contents.split('\n').at(-1));
          return JSON.stringify({ criteria: rounds.flatMap(({ criteria }) => criteria.map(({ key }) => ({
            key, points: 2, evidence: '没有这段话', feedback: '回答完整。', suggestion: '',
          }))) });
        },
      }]);
      assert.equal((await evaluate()).data.session.evaluation.reason, 'invalid_response');

      resetGeminiStateForTests();
      let beginEvaluation;
      let finishEvaluation;
      const started = new Promise((resolve) => { beginEvaluation = resolve; });
      const waiting = new Promise((resolve) => { finishEvaluation = resolve; });
      setAiProvidersForTests([{
        id: 'gemini', model: 'interview-fixture',
        async generate({ contents }) {
          calls += 1;
          beginEvaluation();
          await waiting;
          const { rounds } = JSON.parse(contents.split('\n').at(-1));
          return JSON.stringify({
            points: 999,
            criteria: rounds.flatMap(({ criteria, follow_up_answer }) => criteria.map(({ key }, index) => ({
              key, points: index === 0 ? 2 : 1, evidence: follow_up_answer,
              feedback: index === 0 ? '说明了如何记录结果。' : '需要说明检查标准。',
              suggestion: index === 0 ? '' : '说明你如何判断结果是否符合预期。',
            }))),
          });
        },
      }]);
      const active = evaluate();
      const concurrent = await Promise.race([started.then(() => evaluate()), active]).finally(finishEvaluation);
      assert.equal(concurrent.status, 202);
      const evaluated = (await active).data.session;
      assert.equal(evaluated.evaluation_status, 'ai');
      assert.deepEqual(evaluated.score, { points: 9, max_points: 12 });
      assert.equal(evaluated.evaluation.criteria.length, 6);
      assert.equal(evaluated.evaluation.strengths.length, 1);
      assert.equal(evaluated.evaluation.mistakes.length, 1);
      assert.equal(evaluated.evaluation.suggestions.length, 1);
      assert.equal((await evaluate()).data.session.evaluation.points, 9);
      assert.equal(calls, 2);
      assert.deepEqual((await request(path)).data.session, evaluated);
      const history = (await request(base)).data;
      assert.equal(history.sessions.length, 1);
      assert.deepEqual(history.sessions[0].progress, { answered: 6, total: 6 });
      assert.deepEqual(history.sessions[0].score, evaluated.score);
      assert.deepEqual((await request(base, { identity: 1 })).data.sessions, []);
      const usage = await database.query('SELECT request_count FROM ai_usage_daily WHERE user_id = $1', [identities[0].id]);
      assert.equal(usage.rows[0].request_count, 4);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
