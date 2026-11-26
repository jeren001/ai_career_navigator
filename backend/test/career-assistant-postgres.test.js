import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';

const path = '/api/career-assistant/conversations';

test('Career Assistant documents authenticated routes and their schemas', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const { paths, components } = await fetch(
      `http://127.0.0.1:${server.address().port}/api-docs/openapi.json`,
    ).then((response) => response.json());
    for (const [url, methods] of [[path, ['get', 'post']], [path + '/{id}', ['get', 'delete']],
      [path + '/{id}/messages', ['post']]]) {
      for (const method of methods) assert.deepEqual(paths[url][method].security, [{ bearerAuth: [] }]);
    }
    assert.deepEqual(components.schemas.AssistantMessage.required, ['message', 'revision']);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('Career Assistant validates history, context consent, shared quotas and isolation on PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 20000 }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, guest] } = await database.query(
        `INSERT INTO users (is_guest, preferred_language, career_goals) VALUES
         (false, 'zh-CN', 'Owner goal'), (false, 'en', 'Other account goal'), (true, 'en', NULL)
         RETURNING id, is_guest`,
      );
      await database.query(
        `INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles, career_match)
         VALUES ($1, '[]', '{"analytics":5}', '[]', $2)`,
        [owner.id, JSON.stringify({
          professions: [{ slug: 'data-analyst', title: 'Data Analyst', reason: 'Assessment preference' }],
          personalization: { roadmap: [{ phase: 'Explore', action: 'Analyze public data', outcome: 'One chart' }] },
        })],
      );
      await database.query(
        'INSERT INTO user_skills (user_id, name, skill_key, notes) VALUES ($1, $2, $3, $4)',
        [owner.id, 'SQL', 'sql', 'Private note'],
      );

      await database.query(
        `INSERT INTO practical_challenge_submissions
          (id, user_id, challenge_id, artifact, language, skill_keys, rubric_snapshot)
          VALUES ('14c3244f-289a-4fa2-8299-23dd7d06d076', $1, 'sc-ta-query-library',
                  'Private practice artifact', 'en', ARRAY['sql'], '[]')`,
        [owner.id],
      );

      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const base = `http://127.0.0.1:${server.address().port}`;
      async function request(url, method = 'GET', body, user = owner) {
        const response = await fetch(base + url, {
          method,
          headers: {
            ...(user && { authorization: 'Bearer ' + createAccessToken(user) }),
            ...(body !== undefined && { 'content-type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        assert.equal(response.headers.get('cache-control'), 'no-store');
        return { status: response.status, data: response.status === 204 ? null : await response.json() };
      }

      assert.equal((await request(path, 'GET', undefined, null)).status, 401);
      assert.equal((await request(path, 'POST', {}, guest)).status, 401);
      assert.equal((await request(path, 'POST', { language: 'fr' })).status, 400);
      const { status, data: conversation } = await request(path, 'POST', {});
      assert.equal(status, 201);
      assert.equal(conversation.language, 'zh-CN');
      const url = path + '/' + conversation.id;
      const messages = url + '/messages';

      assert.equal((await request(url, 'GET', undefined, other)).status, 404);
      assert.equal((await request(messages, 'POST', { message: 'Hello', revision: 0 }, other)).status, 404);
      assert.equal((await request(url, 'DELETE', undefined, other)).status, 404);
      assert.deepEqual((await request(path, 'GET', undefined, other)).data.conversations, []);
      assert.equal((await request(url + '?limit=51')).status, 400);
      assert.equal((await request(messages, 'POST', { message: 'Hello', revision: 0, context: ['profile', 'profile'] })).status, 400);

      const prompts = [];
      const provider = {
        id: 'gemini', model: 'assistant-test',
        async generate({ contents, systemInstruction }) {
          assert.match(systemInstruction, /Never state or invent job vacancies/);
          prompts.push(JSON.parse(contents));
          return JSON.stringify({ reply: '可以先尝试一个小项目。' });
        },
      };
      setAiProvidersForTests([provider]);
      const first = await request(messages, 'POST', { message: '我应该怎样开始？', revision: 0 });
      assert.equal(first.status, 201);
      assert.equal(first.data.turn.source, 'ai');
      assert.equal(first.data.revision, 1);
      assert.deepEqual(prompts[0].context, {});
      assert.equal(prompts[0].language, 'Simplified Chinese');
      assert.equal((await request(messages, 'POST', { message: 'duplicate', revision: 0 })).status, 409);

      resetGeminiStateForTests();
      setAiProvidersForTests([provider]);
      const second = await request(messages, 'POST', {
        message: '请继续。', revision: 1, context: ['profile', 'assessment', 'career_match', 'skills', 'roadmap', 'practice'],
      });
      assert.equal(second.status, 201);
      assert.deepEqual(second.data.turn.context_used, ['profile', 'assessment', 'career_match', 'skills', 'roadmap', 'practice']);
      assert.equal(prompts[1].context.profile.goals, 'Owner goal');
      assert.equal(prompts[1].context.assessment.traits.analytics, 5);
      assert.equal(prompts[1].context.roadmap[0].outcome, 'One chart');
      assert.equal(prompts[1].context.career_match[0].slug, 'data-analyst');
      assert.equal(prompts[1].context.skills[0].name, 'SQL');
      assert.equal(prompts[1].context.practice.challenges[0].submitted_count, 1);
      assert.doesNotMatch(JSON.stringify(prompts), /Private note|Other account goal|Private practice artifact/);
      assert.deepEqual(prompts[1].conversation, [{
        user_message: first.data.turn.user_message, assistant_message: first.data.turn.assistant_message,
      }]);

      const recent = await request(url + '?limit=1');
      assert.equal(recent.data.next_before, 2);
      const older = await request(url + '?limit=1&before=' + recent.data.next_before);
      assert.equal(older.data.turns[0].turn_number, 1);
      assert.equal(older.data.next_before, null);
      assert.equal((await request(path + '?offset=0')).data.conversations[0].id, conversation.id);

      const { rows: [usage] } = await database.query('SELECT request_count FROM ai_usage_daily WHERE user_id = $1', [owner.id]);
      assert.equal(usage.request_count, 2);
      await database.query('UPDATE ai_usage_daily SET request_count = request_limit WHERE user_id = $1', [owner.id]);
      resetGeminiStateForTests();
      setAiProvidersForTests([provider]);
      const fallback = await request(messages, 'POST', { message: '有什么职位空缺？', revision: 2, context: ['profile'] });
      assert.equal(fallback.data.turn.reason, 'daily_limit');
      assert.equal(fallback.data.turn.source, 'fallback');
      assert.deepEqual(fallback.data.turn.context_used, []);
      assert.match(fallback.data.turn.assistant_message, /无法核实/);
      assert.equal(prompts.length, 2);

      assert.equal((await request(url, 'DELETE')).status, 204);
      assert.equal((await request(url)).status, 404);
      const { rowCount } = await database.query('SELECT 1 FROM career_assistant_turns WHERE conversation_id = $1', [conversation.id]);
      assert.equal(rowCount, 0);

      resetGeminiStateForTests();
      setAiProvidersForTests([]);
      const english = await request(path, 'POST', { language: 'en' });
      const noProvider = await request(path + '/' + english.data.id + '/messages', 'POST', {
        message: 'How do I practice for an interview?', revision: 0,
      });
      assert.equal(noProvider.data.turn.reason, 'not_configured');
      assert.match(noProvider.data.turn.assistant_message, /interview question/);

      const englishUrl = path + '/' + english.data.id;
      await database.query('DELETE FROM ai_usage_daily WHERE user_id = $1', [owner.id]);
      resetGeminiStateForTests();
      setAiProvidersForTests([{
        id: 'gemini', model: 'assistant-test',
        async generate() {
          return JSON.stringify({ reply: 'This role pays $100,000.' });
        },
      }]);
      const invalidReply = await request(englishUrl + '/messages', 'POST', { message: 'What is the salary?', revision: 1 });
      assert.equal(invalidReply.data.turn.reason, 'invalid_response');
      assert.match(invalidReply.data.turn.assistant_message, /can’t verify/);

      resetGeminiStateForTests();
      const started = Promise.withResolvers();
      const release = Promise.withResolvers();
      setAiProvidersForTests([{
        id: 'gemini', model: 'assistant-test',
        async generate() {
          started.resolve();
          await release.promise;
          return JSON.stringify({ reply: 'Outline one small project.' });
        },
      }]);
      const pending = request(englishUrl + '/messages', 'POST', { message: 'How do I start?', revision: 2 });
      try {
        await Promise.race([started.promise, pending.then(() => assert.fail('Provider was not reached'))]);
        assert.equal((await request(englishUrl, 'DELETE')).status, 204);
      } finally {
        release.resolve();
      }
      assert.equal((await pending).status, 404);
      assert.equal((await request(englishUrl)).status, 404);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK').finally(() => database.release());
      await pool.end();
    }
  });
