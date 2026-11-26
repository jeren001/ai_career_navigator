import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import { createApp } from '../src/app.js';
import pool from '../src/db/pool.js';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { evaluateAnswers, loadActiveCareers, QUESTIONS } from '../src/services/assessment.js';
import { createAccessToken } from '../src/services/auth.js';
import { recordPracticalAssessment } from '../src/services/user-skills.js';

test('Career Match saves assessment and refresh guidance and reads current evidence from PostgreSQL',
  { skip: process.env.RUN_SKILLS_POSTGRES_TEST !== '1', timeout: 20000 }, async () => {
    const database = await pool.connect();
    let server;
    try {
      await database.query('BEGIN');
      const { rows: [owner, other, guest] } = await database.query(`
        INSERT INTO users (is_guest) VALUES (false), (false), (true) RETURNING id, is_guest
      `);
      const tokens = new Map([owner, other, guest].map((user) => [user, createAccessToken(user)]));
      server = createApp(database).listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = `http://127.0.0.1:${server.address().port}`;
      const path = '/api/career-match';
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
        return { response: response.status, data: response.status === 204 ? null : await response.json() };
      }

      const spec = await request('/api-docs/openapi.json');
      assert.deepEqual(spec.data.paths[path].get.security, [{ bearerAuth: [] }]);
      assert.deepEqual(spec.data.paths[`${path}/refresh`].post.security, [{ bearerAuth: [] }]);
      assert.equal((await request(path, 'GET', undefined, null)).response, 401);
      assert.equal((await request(path)).response, 404);
      assert.equal((await request(`${path}/refresh`, 'POST')).response, 404);
      assert.equal((await request(`${path}/refresh`, 'POST', {}, guest)).response, 401);
      assert.equal((await request(`${path}/refresh`, 'POST', { user_id: other.id })).response, 400);
      assert.equal((await request(`${path}/refresh`, 'POST', { language: 'fr' })).response, 400);

      const answers = QUESTIONS.slice(0, 15).map(({ id, options }) => ({ question_id: id, option_id: options[0].id }));
      const roles = await loadActiveCareers(database);
      const { recommendations: baseline, trait_scores: traits } = evaluateAnswers(answers, roles);
      const { rows: [legacy] } = await database.query(
        `INSERT INTO quiz_sessions (user_id, answers, trait_scores, recommended_roles)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [guest.id, JSON.stringify(answers), JSON.stringify(traits), JSON.stringify(baseline.professions)],
      );
      const legacyMatch = (await request(path, 'GET', undefined, guest)).data;
      assert.equal(legacyMatch.assessment_session_id, legacy.id);
      assert.equal(legacyMatch.personalization.reason, 'not_saved');
      assert.deepEqual(legacyMatch.professions, baseline.professions);

      let calls = 0;
      let promptInput;
      function setProvider(chinese) {
        resetGeminiStateForTests();
        setAiProvidersForTests([{
          id: 'gemini', model: 'career-match-fixture',
          async generate({ contents }) {
            calls += 1;
            promptInput = JSON.parse(contents.split('\n').at(-1));
            if (chinese) assert.match(contents, /Simplified Chinese/);
            return JSON.stringify({
              overview: chinese ? '从公共交通数据项目开始。' : 'Start with a transit data project.',
              strengths: [],
              skills_to_develop: chinese ? ['统计学', '数据可视化'] : ['Statistics', 'Data visualization'],
              roadmap: [1, 2, 3].map((index) => ({
                phase: chinese ? `第${index}步` : `Step ${index}`,
                action: chinese ? '分析一份公交数据。' : 'Analyze one transit dataset.',
                outcome: chinese ? '写一份数据摘要。' : 'Write a data summary.',
              })),
              profession_explanations: [{ slug: promptInput.professions[0].slug, explanation: chinese ? '尝试分析公交准点率。' : 'Explore transit on-time performance.' }],
            });
          },
        }]);
      }
      setProvider(false);
      const completed = await request('/api/assessment/evaluate', 'POST', { answers });
      assert.equal(completed.response, 201);
      assert.equal(completed.data.personalization.status, 'ai');
      const first = await request(path);
      assert.equal(first.response, 200);
      assert.equal(first.data.assessment_session_id, completed.data.session_id);
      assert.equal(first.data.refreshed_at, null);
      assert.deepEqual(first.data.personalization, completed.data.personalization);
      assert.deepEqual(first.data.professions, completed.data.professions);
      assert.equal((await request(path, 'GET', undefined, other)).response, 404);
      assert.equal(calls, 1);

      const profile = await request('/api/profile', 'PATCH', { preferred_language: 'zh-CN', career_goals: '制作公交数据仪表板' });
      assert.equal(profile.response, 200);
      const skill = await request('/api/skills', 'POST', { name: 'SQL', self_assessed_level: 5 });
      assert.equal(skill.response, 201);
      await recordPracticalAssessment(database, owner.id, skill.data.skill.id, { skill_name: 'SQL', level: 2, reference: 'trusted-fixture' });
      const { rows: [challenge] } = await database.query(
        `INSERT INTO practical_challenge_submissions (id, user_id, challenge_id, artifact, language, skill_keys, rubric_snapshot, status, evaluation)
         VALUES (gen_random_uuid(), $1, 'sc-ta-query-library', 'synthetic practice artifact', 'en', ARRAY['sql'], '{}',
           'evaluated', '{"status":"ai","points":3,"max_points":3}') RETURNING id`, [owner.id],
      );
      const withEvidence = await request(path);
      assert.equal(withEvidence.data.skills[0].self_assessment.level, 5);
      assert.equal(withEvidence.data.skills[0].practical_assessment.level, 2);
      const sqlGap = withEvidence.data.skill_gaps.prioritized_gaps.find(({ key }) => key === 'sql');
      assert.deepEqual([sqlGap.evidence, sqlGap.current_level, sqlGap.status], ['practical', 2, 'below_target']);
      assert.equal(withEvidence.data.challenge_practice.scope, 'practice_activity');
      const [practice] = withEvidence.data.challenge_practice.history;
      assert.equal(practice.latest_submission_id, challenge.id);
      assert.equal(practice.evaluated_count, 1);
      assert.equal(practice.points, undefined);
      assert.equal(practice.artifact, undefined);
      assert.deepEqual(withEvidence.data.personalization, first.data.personalization);
      assert.equal(calls, 1);

      setProvider(true);
      const refreshed = await request(`${path}/refresh`, 'POST');
      assert.equal(refreshed.response, 200);
      assert.equal(refreshed.data.language, 'zh-CN');
      assert.ok(refreshed.data.refreshed_at);
      assert.equal(refreshed.data.personalization.status, 'ai');
      assert.match(refreshed.data.professions[0].title, /\p{Script=Han}/u);
      assert.match(refreshed.data.challenge_practice.history[0].title, /\p{Script=Han}/u);
      assert.ok(refreshed.data.skill_gaps.prioritized_gaps.some(({ name }) => /\p{Script=Han}/u.test(name)));
      const ranking = (list) => list.map(({ id, match_percent }) => ({ id, match_percent }));
      assert.deepEqual(ranking(refreshed.data.professions), ranking(baseline.professions));
      assert.equal(promptInput.profile.career_goals, '制作公交数据仪表板');
      assert.deepEqual(promptInput.match_evidence.structured_skills, [
        { name: 'SQL', self_reported_level: 5, recorded_practical_level: 2 },
      ]);
      assert.deepEqual(
        promptInput.match_evidence.prioritized_gaps.map(({ key }) => key),
        refreshed.data.skill_gaps.prioritized_gaps.slice(0, 10).map(({ key }) => key),
      );
      assert.equal(promptInput.match_evidence.challenge_practice[0].evaluated_count, 1);
      assert.equal(promptInput.match_evidence.challenge_practice[0].points, undefined);
      assert.equal(calls, 2);
      assert.deepEqual((await request(path)).data, refreshed.data);

      const repeated = await request(`${path}/refresh`, 'POST');
      assert.equal(repeated.response, 200);
      assert.equal(repeated.data.personalization.cached, true);
      assert.equal(calls, 2);

      const changed = await request(`/api/skills/${skill.data.skill.id}`, 'DELETE');
      assert.equal(changed.response, 204);
      const afterRemoval = (await request(path)).data;
      assert.equal(afterRemoval.skill_gaps.prioritized_gaps.find(({ key }) => key === 'sql').status, 'missing');
      assert.equal(afterRemoval.challenge_practice.history.length, 1);
      assert.equal(calls, 2);

      setAiProvidersForTests([]);
      const fallback = await request(`${path}/refresh`, 'POST', { language: 'en' });
      assert.equal(fallback.response, 200);
      assert.equal(fallback.data.language, 'en');
      assert.equal(fallback.data.personalization.reason, 'not_configured');
      assert.deepEqual(ranking(fallback.data.professions), ranking(baseline.professions));
      assert.deepEqual((await request(path)).data, fallback.data);

      await database.query(
        'UPDATE ai_usage_daily SET request_count = request_limit WHERE user_id = $1 AND usage_date = CURRENT_DATE',
        [owner.id],
      );
      setProvider(false);
      const limited = await request(`${path}/refresh`, 'POST', { language: 'en' });
      assert.equal(limited.response, 200);
      assert.equal(limited.data.personalization.reason, 'daily_limit');
      assert.deepEqual(ranking(limited.data.professions), ranking(baseline.professions));
      assert.equal(calls, 2);
    } finally {
      resetGeminiStateForTests();
      if (server) await new Promise((resolve) => server.close(resolve));
      await database.query('ROLLBACK');
      database.release();
      await pool.end();
    }
  });
