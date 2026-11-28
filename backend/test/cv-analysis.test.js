import assert from 'node:assert/strict';
import { test } from 'node:test';
import { rubric, scoreAnalysis } from '../src/services/cv-analysis-rubric.js';
import { cvEvidence } from '../src/services/cv-analysis-evidence.js';

function criteriaFor(scores) {
  return Object.fromEntries(rubric.flatMap(([, , criteria], index) =>
    criteria.map(([id, max]) => [id, { status: 'scored', points: scores[index] * max / 100 }]),
  ));
}

test('CV rubric uses the specified weights and classifies the displayed rounded score', () => {
  const criteria = criteriaFor([85, 72, 90, 65, 75, 81]);
  assert.deepEqual(rubric.map(([, weight]) => weight), [25, 20, 15, 15, 15, 10]);
  assert.ok(rubric.every(([, , items]) => items.reduce((sum, [, max]) => sum + max, 0) === 100));
  assert.deepEqual(scoreAnalysis(criteria, 'en').overall, {
    score: 78, weighted_score: 78.25, status: 'complete',
    classification: { id: 'good', label: 'Good' }, scored_category_weight: 100,
  });
  const rounded = scoreAnalysis(criteriaFor([89.5, 89.5, 89.5, 89.5, 89.5, 89.5]), 'zh-CN').overall;
  assert.equal(rounded.score, 90);
  assert.equal(rounded.classification.label, '优秀');
});

test('CV scoring distinguishes genuine exclusions from missing evidence', () => {
  const criteria = criteriaFor([80, 80, 80, 80, 80, 80]);
  criteria.date_formatting = { status: 'not_applicable', points: null };
  const excluded = scoreAnalysis(criteria, 'en');
  assert.equal(excluded.categories[2].score, 80);
  assert.equal(excluded.categories[2].status, 'complete');
  assert.equal(excluded.categories[2].applicable_points, 85);
  criteria.date_formatting.status = 'unavailable';
  const missing = scoreAnalysis(criteria, 'en');
  assert.equal(missing.categories[2].status, 'partial');
  assert.equal(missing.categories[2].applicable_points, 100);
  assert.equal(missing.overall.status, 'partial');
  for (const [id] of rubric[5][2]) criteria[id] = { status: 'not_applicable', points: null };
  assert.equal(scoreAnalysis(criteria, 'en').overall.scored_category_weight, 90);
  assert.equal(scoreAnalysis(criteria, 'en').overall.score, 80);
  for (const [id] of rubric[5][2]) criteria[id].status = 'unavailable';
  assert.equal(scoreAnalysis(criteria, 'en').overall.score, null);
});

test('CV evidence detects bilingual sections and excludes contact fields', () => {
  const view = cvEvidence({
    sections: {}, contact: { email: 'different@example.test' },
    extracted_text: '姓名：李测试\n联系方式\nprivate@example.test\n专业技能：SQL\n项目经历\n创建了报表\nLanguages: English',
  });
  assert.equal(view.hasContact, true);
  assert.ok(view.sections.has('languages'));
  assert.ok(view.sections.has('personal_information'));
  assert.deepEqual(view.evidence.map(({ text }) => text), ['SQL', 'English', '创建了报表']);
  assert.equal(cvEvidence({ sections: {}, contact: { email: 'saved@example.test' }, extracted_text: 'Skills: SQL' }).hasContact, false);
});
