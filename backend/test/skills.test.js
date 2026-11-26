import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { resetGeminiStateForTests, setAiProvidersForTests } from '../src/services/assessment-ai.js';
import { compareSkillsToCareers, compareUserSkills } from '../src/services/skill-comparison.js';
import { skillKey } from '../src/services/user-skills.js';

const careers = [
  { id: 1, slug: 'data-analyst', title: 'Data Analyst', market_pulse: {
    key_skills: ['SQL', 'Statistics', 'Dashboard design', 'Python', 'Spreadsheet modeling'],
  } },
  { id: 2, slug: 'data-engineer', title: 'Data Engineer', market_pulse: { key_skills: ['SQL', 'Data modeling', 'SQL'] } },
  { id: 3, slug: 'unknown', title: 'Unknown', market_pulse: {} },
];
const skills = [
  { id: 1, key: skillKey('ＳＱＬ'), self_assessment: { level: 5 }, practical_assessment: { level: 1 } },
  { id: 2, key: skillKey('statistics'), self_assessment: { level: 2 }, practical_assessment: null },
  { id: 3, key: skillKey('仪表盘设计'), self_assessment: null, practical_assessment: null },
  { id: 4, key: skillKey('Python'), self_assessment: { level: 3 }, practical_assessment: null },
];

afterEach(resetGeminiStateForTests);

test('comparison uses practical evidence, flags unknown levels, and prioritizes shared gaps', () => {
  const result = compareSkillsToCareers(skills, careers);
  const [sql, spreadsheet, modeling, statistics, dashboard] = result.prioritized_gaps;
  assert.deepEqual([sql.key, sql.priority, sql.current_level, sql.evidence, sql.career_ids], ['sql', 'high', 1, 'practical', [1, 2]]);
  assert.deepEqual([spreadsheet.status, modeling.status, statistics.priority, dashboard.status], ['missing', 'missing', 'medium', 'unrated']);
  assert.equal(result.careers[0].requirements.find(({ key }) => key === 'python').status, 'meets_target');
  assert.equal(result.careers[1].requirements.length, 2);
  assert.equal(result.careers[2].requirements_status, 'unavailable');
});

test('guidance is bilingual, shares provider limits and caching, and preserves deterministic comparisons', async () => {
  let reservations = 0;
  let calls = 0;
  const database = {
    async query(sql) {
      if (sql.includes('FROM career_roles')) return { rows: [careers[0]] };
      if (sql.includes('FROM user_skills')) return { rows: [] };
      if (sql.includes('INSERT INTO ai_usage_daily')) {
        reservations += 1;
        return { rows: [{ request_count: 1 }] };
      }
      if (sql.includes('FROM users WHERE')) return { rows: [{ preferred_language: 'zh-CN', career_goals: '公共交通可视化' }] };
      assert.fail('Unexpected query');
    },
  };
  setAiProvidersForTests([{
    id: 'gemini',
    model: 'fixture',
    async generate({ contents }) {
      calls += 1;
      assert.match(contents, /Simplified Chinese/);
      const input = JSON.parse(contents.split('\n').at(-1));
      assert.equal(input.goal, '公共交通可视化');
      return JSON.stringify({ recommendations: input.gaps.map(({ skill_key, name }) => ({
        skill_key, action: `用${name}分析一份公共交通数据。`,
      })) });
    },
  }]);
  const request = { career_ids: [1] };
  const first = await compareUserSkills(database, 7, request);
  const repeat = await compareUserSkills(database, 7, request);
  const skipped = await compareUserSkills(database, 7, { ...request, include_ai: false });
  assert.equal(first.guidance.status, 'ai');
  assert.equal(first.guidance.recommendations[0].action, '用SQL分析一份公共交通数据。');
  assert.equal(repeat.guidance.cached, true);
  assert.equal(skipped.guidance.status, 'skipped');
  assert.deepEqual(first.prioritized_gaps, skipped.prioritized_gaps);
  assert.deepEqual([calls, reservations], [1, 1]);
});

test('AI cannot substitute a skill or override the computed gaps', async () => {
  const database = {
    async query(sql) {
      if (sql.includes('FROM career_roles')) return { rows: [careers[0]] };
      if (sql.includes('FROM user_skills')) return { rows: [] };
      if (sql.includes('INSERT INTO ai_usage_daily')) return { rows: [{ request_count: 1 }] };
      if (sql.includes('FROM users WHERE')) return { rows: [{ preferred_language: 'en' }] };
      assert.fail('Unexpected query');
    },
  };
  setAiProvidersForTests([{
    id: 'gemini',
    async generate() {
      return JSON.stringify({ recommendations: careers[0].market_pulse.key_skills.map(() => ({
        skill_key: 'invented', action: 'Discard this skill.',
      })) });
    },
  }]);
  const comparison = await compareUserSkills(database, 7, { career_ids: [1] });
  assert.equal(comparison.guidance.status, 'fallback');
  assert.equal(comparison.guidance.reason, 'invalid_response');
  assert.ok(comparison.guidance.recommendations[0].action.includes('SQL'));
});
