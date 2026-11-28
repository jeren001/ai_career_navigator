import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';

test('personal progress survives restart and stays isolated across accounts',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 25_000 }, async () => {
    const { rows: [owner, other, guest] } = await pool.query(
      "INSERT INTO users (is_guest, preferred_language) VALUES (false, 'zh-CN'), (false, 'en'), (true, 'en') RETURNING id, is_guest",
    );
    const servers = [];
    let origin;
    async function startServer() {
      const server = createApp(pool).listen(0, '127.0.0.1');
      servers.push(server);
      await once(server, 'listening');
      origin = `http://127.0.0.1:${server.address().port}`;
      return server;
    }
    async function request(path, method = 'GET', body, identity = owner) {
      const response = await fetch(origin + '/api' + path, {
        method,
        headers: {
          ...(identity && { authorization: 'Bearer ' + createAccessToken(identity) }),
          ...(body !== undefined && { 'content-type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      return { status: response.status, data: response.status === 204 ? null : await response.json() };
    }

    setAiProvidersForTests([]);
    try {
      const server = await startServer();
      assert.equal((await request('/dashboard', 'GET', undefined, guest)).status, 401);
      assert.equal((await request('/assessment/history', 'GET', undefined, null)).status, 401);

      const started = await request('/assessment/start', 'POST', {});
      assert.equal(started.status, 201);
      const id = started.data.assessment_id;
      function answer(question, path = '/assessment/answer') {
        return request(path, 'POST', { assessment_id: id, question_id: question.id, option_id: question.options[0].id });
      }
      let current = started.data;
      for (let index = 0; index < 14; index += 1) {
        const next = await answer(current.question);
        assert.equal(next.status, 200, JSON.stringify(next.data));
        current = next.data;
      }
      assert.equal(current.stage, 'clarification');
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await startServer();
      const resumed = await request('/quiz/' + id);
      assert.deepEqual(resumed.data, current);
      assert.equal((await request('/assessment/drafts')).data.drafts[0].progress.answered, 14);
      assert.equal((await request('/assessment/' + id, 'GET', undefined, other)).status, 404);
      assert.equal((await request('/assessment/answer', 'POST', {
        assessment_id: id, question_id: current.question.id, option_id: current.question.options[0].id,
      }, other)).status, 404);
      const dashboardBefore = await request('/dashboard');
      assert.equal(dashboardBefore.data.progress.assessment.answered, 14);
      assert.equal(dashboardBefore.data.recommendations, null);
      for (let index = 0; index < 3; index += 1) {
        const next = await answer(current.question);
        assert.equal(next.status, 200, JSON.stringify(next.data));
        current = next.data;
      }
      const final = await Promise.all([answer(current.question), answer(current.question, '/quiz/answer')]);
      assert.equal(final.filter(({ status }) => status === 200).length, 1);
      const result = final.find(({ status }) => status === 200).data.result;
      assert.equal(result.language, 'zh-CN');
      assert.deepEqual((await request('/assessment/' + id)).data.result, result);
      assert.deepEqual((await request('/assessment/history')).data.assessments, [result]);
      assert.deepEqual((await request('/assessment/drafts')).data.drafts, []);
      assert.deepEqual((await request('/assessment/history', 'GET', undefined, other)).data.assessments, []);
      assert.deepEqual((await request('/assessment/history?before=' + result.session_id)).data.assessments, []);

      const conversations = '/career-assistant/conversations';
      const { data: pinned } = await request(conversations, 'POST', { title: '职业规划' });
      const { data: unpinned } = await request(conversations, 'POST', {});
      const chat = conversations + '/' + pinned.id;
      assert.equal((await request(chat, 'PATCH', { pinned: true }, other)).status, 404);
      assert.equal((await request(chat, 'PATCH', { pinned: 'true' })).status, 400);
      const renamed = await request(chat, 'PATCH', { title: '学习规划', pinned: true });
      assert.equal(renamed.data.title, '学习规划');
      assert.equal(renamed.data.revision, 0);
      assert.deepEqual((await request(conversations)).data.conversations.map(({ id }) => id), [pinned.id, unpinned.id]);
      const message = await request(chat + '/messages', 'POST', { revision: 0, message: '如何练习面试？' });
      assert.equal(message.status, 201);
      const bookmark = chat + '/messages/1/bookmark';
      assert.equal((await request(bookmark, 'PUT', { bookmarked: true }, other)).status, 404);
      const marked = await request(bookmark, 'PUT', { bookmarked: true });
      assert.ok(marked.data.bookmarked_at);
      assert.deepEqual((await request(bookmark, 'PUT', { bookmarked: true })).data, marked.data);
      assert.equal((await request(chat)).data.turns[0].bookmarked_at, marked.data.bookmarked_at);
      assert.equal((await request('/career-assistant/bookmarks')).data.bookmarks[0].assistant_message, message.data.turn.assistant_message);
      assert.deepEqual((await request('/career-assistant/bookmarks', 'GET', undefined, other)).data.bookmarks, []);
      assert.equal((await request(bookmark, 'PUT', { bookmarked: false })).data.bookmarked_at, null);
      await request(bookmark, 'PUT', { bookmarked: true });
      assert.equal((await request(chat, 'DELETE')).status, 204);
      assert.deepEqual((await request('/career-assistant/bookmarks')).data.bookmarks, []);

      const resource = '/learning/progress/lh-psf-the-python-tutorial';
      assert.equal((await request(resource, 'PATCH', { completed: true }, guest)).status, 401);
      assert.equal((await request(resource, 'PATCH', { completed: 1 })).status, 400);
      assert.equal((await request('/learning/progress/missing', 'PATCH', { completed: true })).status, 404);
      const learned = await Promise.all([
        request(resource, 'PATCH', { bookmarked: true }),
        request(resource, 'PATCH', { completed: true }),
      ]);
      assert.ok(learned.every(({ status }) => status === 200), JSON.stringify(learned));
      const { data: learning } = await request('/learning/progress?status=completed');
      assert.equal(learning.language, 'zh-CN');
      assert.equal(learning.progress[0].resource.title, 'Python 教程');
      assert.ok(learning.progress[0].bookmarked_at);
      assert.deepEqual((await request('/learning/progress', 'GET', undefined, other)).data.progress, []);

      const roadmap = await request('/roadmaps', 'POST', {});
      assert.equal(roadmap.status, 201, JSON.stringify(roadmap.data));
      const plan = '/roadmaps/' + roadmap.data.roadmap.id;
      const milestone = roadmap.data.roadmap.milestones[0].id;
      assert.equal((await request(plan + '/milestones/' + milestone, 'PATCH', { completed: true })).status, 200);
      assert.equal((await request(plan, 'PATCH', { archived: true }, other)).status, 404);
      assert.equal((await request(plan, 'DELETE', undefined, other)).status, 404);
      const archived = await request(plan, 'PATCH', { archived: true });
      assert.ok(archived.data.roadmap.archived_at);
      assert.deepEqual((await request('/roadmaps')).data.roadmaps, []);
      assert.equal((await request('/roadmaps?status=archived')).data.roadmaps[0].progress.completed_milestones, 1);
      assert.equal((await request(plan, 'PATCH', { archived: false })).data.roadmap.archived_at, null);

      const { status, data: dashboard } = await request('/dashboard');
      assert.equal(status, 200, JSON.stringify(dashboard));
      assert.equal(dashboard.statistics.resources_completed, 1);
      assert.equal(dashboard.statistics.assessments_completed, 1);
      assert.equal(dashboard.progress.roadmap.completed_milestones, 1);
      assert.equal(dashboard.recommendations.assessment_session_id, result.session_id);
      assert.ok(dashboard.recent_activity.some(({ kind, label }) => kind === 'resource_completed' && label === '已完成学习资源'));
      const empty = (await request('/dashboard', 'GET', undefined, other)).data;
      assert.deepEqual(empty.recent_activity, []);
      assert.equal(empty.recommendations, null);
      assert.equal((await request(plan, 'DELETE')).status, 204);
      const { rowCount } = await pool.query('SELECT 1 FROM roadmap_milestones WHERE id = $1', [milestone]);
      assert.equal(rowCount, 0);
      assert.equal((await request(resource, 'PATCH', { completed: false })).data.progress.completed_at, null);

      const { rows: [legacy] } = await pool.query(
        "INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles) VALUES ($1, '[]', '{}', '[]') RETURNING id",
        [other.id],
      );
      const { assessments } = (await request('/assessment/history', 'GET', undefined, other)).data;
      assert.equal(assessments[0].session_id, legacy.id);
      assert.equal(assessments[0].assessment_id, null);
      assert.deepEqual(assessments[0].professions, []);
    } finally {
      for (const server of servers.filter(({ listening }) => listening)) {
        await new Promise((resolve) => server.close(resolve));
      }
      await pool.query('DELETE FROM users WHERE id = ANY($1::integer[])', [[owner.id, other.id, guest.id]]);
      await pool.end();
    }
  });
