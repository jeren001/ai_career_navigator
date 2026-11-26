import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';

test('My Roadmap saves bilingual plans and owner-only milestone progress in PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 20_000 }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, guest] } = await database.query(`
        INSERT INTO users (is_guest) VALUES (false), (false), (true) RETURNING id, is_guest
      `);
      const tokens = new Map([owner, other, guest].map((user) => [user, createAccessToken(user)]));
      const { rows: [analyst] } = await database.query(`
        SELECT id, slug, title, market_pulse FROM career_roles WHERE slug = 'data-analyst' AND is_active
      `);
      const { rows: [assessment] } = await database.query(`
        INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles)
        VALUES ($1, '[]', '{}', $2::jsonb) RETURNING id
      `, [owner.id, JSON.stringify([{ ...analyst, reason: 'You enjoy finding patterns in data.' }])]);
      await database.query(`
        INSERT INTO practical_challenge_submissions
          (id, user_id, challenge_id, language, artifact, skill_keys, rubric_snapshot, status, evaluation)
        VALUES (gen_random_uuid(), $1, 'sc-ta-query-library', 'en', 'private practice artifact',
          ARRAY['sql'], '{}', 'evaluated', '{"points":3}')
      `, [owner.id]);
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${server.address().port}`;
      const path = '/api/roadmaps';
      async function request(url, method = 'GET', body, identity = owner) {
        const token = tokens.get(identity);
        const response = await fetch(origin + url, {
          method,
          headers: {
            ...(token && { authorization: `Bearer ${token}` }),
            ...(body !== undefined && { 'content-type': 'application/json' }),
          },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        return { status: response.status, data: await response.json() };
      }

      const spec = await request('/api-docs/openapi.json');
      assert.deepEqual(spec.data.paths[path].post.security, [{ bearerAuth: [] }]);
      assert.ok(spec.data.paths[`${path}/{id}/milestones/{milestoneId}`].patch);
      assert.equal((await request(path, 'POST', {}, null)).status, 401);
      assert.equal((await request(path, 'POST', {}, guest)).status, 401);
      assert.equal((await request(path, 'POST', {}, other)).status, 404);
      assert.equal((await request(path, 'POST', { language: 'fr' })).status, 400);
      assert.equal((await request(path, 'POST', { weekly_study_minutes: 1 })).status, 400);
      assert.equal((await request(path, 'POST', { profession_slug: 'software-engineer' })).status, 404);
      assert.equal((await request(`${path}?offset=-1`)).status, 400);
      assert.deepEqual((await request(path)).data, { roadmaps: [], next_offset: null });

      assert.equal((await request('/api/profile', 'PATCH', {
        preferred_language: 'zh-CN', career_goals: '分析公交准点率', interests: ['公共交通'],
      })).status, 200);
      assert.equal((await request('/api/skills', 'POST', { name: 'SQL', self_assessed_level: 2 })).status, 201);

      let calls = 0;
      let input;
      setAiProvidersForTests([{
        id: 'gemini', model: 'roadmap-fixture',
        async generate({ contents }) {
          calls += 1;
          input = JSON.parse(contents.split('\n').at(-1));
          return JSON.stringify({
            milestones: [
              { position: 1, action: '为一份模拟公交数据写出筛选路线的查询。', outcome: '一条可重跑的查询。' },
              { position: 2, action: '使用模拟借阅任务检查分组统计和空结果。', outcome: '查询和分组统计结果。' },
              { position: 3, action: '写一段说明，比较两种公交准点率算法。', outcome: '一份有改进记录的说明。' },
            ],
          });
        },
      }]);
      const created = await request(path, 'POST', { weekly_study_minutes: 60 });
      assert.equal(created.status, 201);
      const { roadmap } = created.data;
      assert.equal(roadmap.assessment_session_id, assessment.id);
      assert.equal(roadmap.language, 'zh-CN');
      assert.match(roadmap.profession.title, /\p{Script=Han}/u);
      assert.deepEqual(roadmap.personalization, { status: 'ai', provider: 'gemini', cached: false });
      assert.equal(roadmap.milestones.length, 3);
      assert.match(roadmap.milestones[0].action, /公交/);
      assert.ok(roadmap.milestones.some(({ resources }) => resources.length));
      const [practice] = roadmap.milestones[1].challenges;
      assert.equal(practice.id, 'sc-ta-query-library');
      assert.equal(practice.prior_submissions, 1);
      assert.equal(practice.prior_evaluations, 1);
      assert.equal(roadmap.study_plan.estimated_weeks, Math.ceil(roadmap.study_plan.estimated_minutes / 60));
      assert.equal(input.profile.career_goals, '分析公交准点率');
      assert.equal(input.prior_practice[0].evaluated_count, 1);
      assert.equal(input.prior_practice[0].points, undefined);
      assert.equal(input.prior_practice[0].artifact, undefined);
      assert.equal(input.recorded_skills[0].self_reported_level, 2);
      assert.ok(roadmap.prioritized_skills.some(({ key, evidence }) => key === 'sql' && evidence === 'self_reported'));

      const detail = `${path}/${roadmap.id}`;
      const milestone = `${detail}/milestones/${roadmap.milestones[0].id}`;
      assert.equal((await request(detail, 'GET', undefined, other)).status, 404);
      assert.equal((await request(milestone, 'PATCH', { completed: true }, other)).status, 404);
      assert.equal((await request(milestone, 'PATCH', { completed: 'true' })).status, 400);
      assert.equal((await request(milestone, 'PATCH', {})).status, 400);
      assert.equal((await request(milestone, 'PATCH', { completed_at: null })).status, 400);
      const updated = await request(milestone, 'PATCH', {
        title: '公交查询练习', notes: '使用模拟数据', estimated_minutes: 40, completed: true,
      });
      assert.equal(updated.status, 200);
      assert.equal(updated.data.roadmap.milestones[0].title, '公交查询练习');
      assert.equal(updated.data.roadmap.milestones[0].notes, '使用模拟数据');
      assert.ok(updated.data.roadmap.milestones[0].completed_at);
      assert.deepEqual(updated.data.roadmap.progress, {
        completed_milestones: 1, total_milestones: 3, completed_estimated_minutes: 40,
      });
      const repeatedCompletion = await request(milestone, 'PATCH', { completed: true });
      assert.equal(repeatedCompletion.data.roadmap.milestones[0].completed_at, updated.data.roadmap.milestones[0].completed_at);
      assert.deepEqual((await request(detail)).data, repeatedCompletion.data);

      const cached = await request(path, 'POST', { weekly_study_minutes: 60 });
      assert.equal(cached.status, 201);
      assert.notEqual(cached.data.roadmap.id, roadmap.id);
      assert.equal(cached.data.roadmap.personalization.cached, true);
      assert.equal(cached.data.roadmap.progress.completed_milestones, 0);
      assert.equal(calls, 1);

      const reopened = await request(milestone, 'PATCH', { completed: false, notes: null });
      assert.equal(reopened.data.roadmap.milestones[0].completed_at, null);
      assert.equal(reopened.data.roadmap.milestones[0].notes, null);
      assert.equal(reopened.data.roadmap.progress.completed_milestones, 0);
      const usage = await database.query('SELECT request_count FROM ai_usage_daily WHERE user_id = $1', [owner.id]);
      assert.equal(usage.rows[0].request_count, 1);
      await database.query('UPDATE ai_usage_daily SET request_count = request_limit WHERE user_id = $1', [owner.id]);
      resetGeminiStateForTests();
      setAiProvidersForTests([{ id: 'gemini', model: 'roadmap-fixture', async generate() { calls += 1; } }]);
      const fallback = await request(path, 'POST', { profession_slug: 'data-analyst', language: 'en' });
      assert.equal(fallback.status, 201);
      assert.equal(fallback.data.roadmap.language, 'en');
      assert.deepEqual(fallback.data.roadmap.personalization, { status: 'fallback', reason: 'daily_limit' });
      assert.equal(fallback.data.roadmap.milestones[0].title, 'Build foundations');
      assert.match(fallback.data.roadmap.milestones[1].action, /^Revisit /);
      assert.equal(calls, 1);
      assert.deepEqual((await request(path)).data.roadmaps.map(({ id }) => id), [
        fallback.data.roadmap.id, cached.data.roadmap.id, roadmap.id,
      ]);
      assert.deepEqual((await request(path, 'GET', undefined, other)).data.roadmaps, []);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
