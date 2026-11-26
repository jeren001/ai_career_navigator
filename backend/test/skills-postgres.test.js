import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { createAccessToken } from '../src/services/auth.js';
import { listUserSkills, recordPracticalAssessment } from '../src/services/user-skills.js';

test('My Skills ownership, assessment evidence and comparison work against PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1' }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, guest] } = await database.query(`
        INSERT INTO users (is_guest, preferred_language)
        VALUES (FALSE, 'zh-CN'), (FALSE, 'en'), (TRUE, 'en')
        RETURNING id, is_guest
      `);
      const { rows: [career] } = await database.query(
        "SELECT id FROM career_roles WHERE slug = 'data-analyst' AND is_active",
      );
      assert.ok(career, 'Seed the career catalog before running this test');
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${server.address().port}`;
      const base = `${origin}/api/skills`;
      const tokens = { owner: createAccessToken(owner), other: createAccessToken(other), guest: createAccessToken(guest) };
      async function request(path = '', method = 'GET', body, identity = 'owner') {
        const response = await fetch(base + path, {
          method,
          headers: {
            ...(tokens[identity] && { authorization: `Bearer ${tokens[identity]}` }),
            ...(body && { 'content-type': 'application/json' }),
          },
          body: body && JSON.stringify(body),
        });
        return { status: response.status, data: response.status === 204 ? null : await response.json() };
      }

      const specResponse = await fetch(`${origin}/api-docs/openapi.json`);
      assert.equal(specResponse.status, 200);
      const spec = await specResponse.json();
      for (const [route, methods] of [
        ['/api/skills', ['get', 'post']],
        ['/api/skills/{id}', ['patch', 'delete']],
        ['/api/skills/compare', ['post']],
      ]) {
        for (const method of methods) assert.deepEqual(spec.paths[route][method].security, [{ bearerAuth: [] }]);
      }
      const swagger = await fetch(`${origin}/api-docs/`);
      assert.equal(swagger.status, 200);
      assert.match(await swagger.text(), /AI Career Navigator API/);

      assert.equal((await request('', 'GET', undefined, 'none')).status, 401);
      assert.equal((await request('', 'GET', undefined, 'guest')).status, 401);
      const added = await request('', 'POST', { name: '结构化查询语言', self_assessed_level: 5, notes: '已练习 JOIN' });
      assert.equal(added.status, 201);
      assert.equal(added.data.skill.key, 'sql');
      assert.equal(added.data.skill.practical_assessment, null);
      const path = `/${added.data.skill.id}`;
      assert.equal((await request('', 'POST', { name: 'ＳＱＬ' })).status, 409);
      assert.equal((await request(path, 'PATCH', { self_assessed_level: 6 })).status, 400);
      assert.equal((await request(path, 'PATCH', { practical_assessment: { level: 5 } })).status, 400);
      assert.equal((await request(path, 'PATCH', { name: 'SQL' }, 'other')).status, 404);
      assert.equal((await request(path, 'DELETE', undefined, 'other')).status, 404);
      assert.deepEqual((await request('', 'GET', undefined, 'other')).data, { skills: [] });

      await recordPracticalAssessment(database, owner.id, added.data.skill.id, {
        skill_name: 'SQL', level: 1, reference: 'exercise-join-001',
      });
      assert.equal((await request(path, 'PATCH', { name: 'Python' })).status, 409);
      const edited = await request(path, 'PATCH', { name: 'SQL', self_assessed_level: 4, notes: null });
      assert.equal(edited.status, 200);
      assert.equal(edited.data.skill.notes, null);
      assert.equal(edited.data.skill.self_assessment.level, 4);
      assert.equal(edited.data.skill.practical_assessment.reference, 'exercise-join-001');

      const patchTarget = await request('', 'POST', { name: 'Python', self_assessed_level: 3 });
      assert.equal(patchTarget.status, 201);
      const renamed = await request(`/${patchTarget.data.skill.id}`, 'PATCH', { name: 'Statistics' });
      assert.equal(renamed.status, 200);
      assert.equal(renamed.data.skill.self_assessment, null);

      const compared = await request('/compare', 'POST', { career_ids: [career.id], include_ai: false });
      assert.equal(compared.status, 200);
      assert.equal(compared.data.language, 'zh-CN');
      assert.equal(compared.data.guidance.status, 'skipped');
      assert.match(compared.data.guidance.recommendations[0].action, /\p{Script=Han}/u);
      const sql = compared.data.prioritized_gaps.find(({ key }) => key === 'sql');
      assert.deepEqual([sql.current_level, sql.evidence, sql.priority], [1, 'practical', 'high']);
      assert.equal(compared.data.prioritized_gaps.find(({ key }) => key === 'statistics').status, 'unrated');
      assert.equal((await request('/compare', 'POST', { career_ids: [career.id, career.id] })).status, 400);
      assert.equal((await request('/compare', 'POST', { career_ids: [2_147_483_647] })).status, 404);

      await database.query(`INSERT INTO ai_usage_daily (user_id, usage_date, request_count, request_limit)
        VALUES ($1, CURRENT_DATE, 5, 5)`, [other.id]);
      let providerCalls = 0;
      setAiProvidersForTests([{
        id: 'gemini',
        model: 'skills-postgres-fixture',
        async generate({ contents }) {
          providerCalls += 1;
          const { gaps } = JSON.parse(contents.split('\n').at(-1));
          return JSON.stringify({ recommendations: gaps.map(({ skill_key, name }) => ({
            skill_key, action: `Complete a small portfolio task using ${name}.`,
          })) });
        },
      }]);
      const comparisonRequest = { career_ids: [career.id], language: 'en' };
      const limited = await request('/compare', 'POST', comparisonRequest, 'other');
      assert.equal(limited.status, 200);
      assert.equal(limited.data.guidance.status, 'fallback');
      assert.equal(limited.data.guidance.reason, 'daily_limit');
      assert.equal(providerCalls, 0);
      const generated = await request('/compare', 'POST', comparisonRequest);
      assert.equal(generated.status, 200);
      assert.equal(generated.data.guidance.status, 'ai');
      assert.equal(generated.data.guidance.cached, false);
      assert.deepEqual(generated.data.prioritized_gaps, compared.data.prioritized_gaps);
      const repeated = await request('/compare', 'POST', comparisonRequest);
      assert.equal(repeated.data.guidance.cached, true);
      assert.equal(providerCalls, 1);
      const usage = await database.query('SELECT request_count FROM ai_usage_daily WHERE user_id = $1 AND usage_date = CURRENT_DATE', [owner.id]);
      assert.equal(usage.rows[0].request_count, 1);

      const clear = await request(path, 'PATCH', { self_assessed_level: null });
      assert.equal(clear.status, 200);
      assert.equal(clear.data.skill.self_assessment, null);
      assert.equal((await listUserSkills(database, owner.id)).length, 2);
      assert.equal((await request(path, 'DELETE')).status, 204);
      assert.deepEqual((await request()).data.skills.map(({ name }) => name), ['Statistics']);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
