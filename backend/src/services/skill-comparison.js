import { reserveDailyAiRequest } from './ai-limits.js';
import { generateAssessmentJson } from './assessment-ai.js';
import { assessmentPrompt } from './assessment-prompts.js';
import { listUserSkills, skillKey, skillsBody, skillsError } from './user-skills.js';

const TARGET_LEVEL = 3;
const MAX_CAREERS = 5;
const MAX_GUIDANCE_GAPS = 5;
const priorityOrder = { high: 0, medium: 1, review: 2, none: 3 };

function checkRequirement(name, inventory) {
  const key = skillKey(name);
  const skill = inventory.get(key);
  const measured = skill?.practical_assessment || skill?.self_assessment;
  const currentLevel = measured?.level ?? null;
  const shortfall = currentLevel === null ? null : Math.max(0, TARGET_LEVEL - currentLevel);
  const status = !skill ? 'missing' : !measured ? 'unrated' : shortfall ? 'below_target' : 'meets_target';
  const priority = status === 'missing' || shortfall >= 2 ? 'high'
    : shortfall === 1 ? 'medium' : status === 'unrated' ? 'review' : 'none';
  return {
    name, key, target_level: TARGET_LEVEL, status, priority,
    skill_id: skill?.id ?? null,
    current_level: currentLevel,
    evidence: skill?.practical_assessment ? 'practical' : skill?.self_assessment ? 'self_reported' : null,
  };
}

// The catalog lists skill names. Level 3 is a planning default, not a hiring requirement.
export function compareSkillsToCareers(skills, careers) {
  const inventory = new Map(skills.map((skill) => [skill.key, skill]));
  const gaps = new Map();
  const comparisons = careers.map(({ id, slug, title, market_pulse }) => {
    const names = new Map();
    const keySkills = market_pulse?.key_skills;
    for (const name of Array.isArray(keySkills) ? keySkills : []) {
      if (typeof name !== 'string' || !name.trim()) continue;
      const key = skillKey(name);
      if (!names.has(key)) names.set(key, name.trim());
    }
    const requirements = [...names.values()].map((name) => checkRequirement(name, inventory));
    requirements.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    for (const requirement of requirements) {
      if (requirement.priority === 'none') continue;
      if (!gaps.has(requirement.key)) gaps.set(requirement.key, { ...requirement, career_ids: [] });
      gaps.get(requirement.key).career_ids.push(id);
    }
    return { id, slug, title, requirements_status: requirements.length ? 'available' : 'unavailable', requirements };
  });
  const prioritizedGaps = [...gaps.values()].sort((a, b) =>
    priorityOrder[a.priority] - priorityOrder[b.priority] || b.career_ids.length - a.career_ids.length);
  return { careers: comparisons, prioritized_gaps: prioritizedGaps, target_basis: 'default_level_3' };
}

function fallbackAction(gap, language) {
  if (language === 'zh-CN') {
    if (gap.status === 'unrated') return `回顾一次使用${gap.name}的练习，并记录当前水平。`;
    return `用${gap.name}完成一项小练习，记录结果和一个改进点。`;
  }
  if (gap.status === 'unrated') return `Review one example of using ${gap.name} and record your current level.`;
  return `Complete one small exercise using ${gap.name} and note one thing to improve.`;
}

const guidanceSchema = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array', minItems: 1, maxItems: MAX_GUIDANCE_GAPS,
      items: {
        type: 'object',
        properties: { skill_key: { type: 'string' }, action: { type: 'string' } },
        required: ['skill_key', 'action'],
      },
    },
  },
  required: ['recommendations'],
};

function validateGuidance(value, gaps, language) {
  if (!Array.isArray(value?.recommendations) || value.recommendations.length !== gaps.length) return undefined;
  const byKey = new Map(value.recommendations.map((item) => [
    item?.skill_key, typeof item?.action === 'string' ? item.action.trim() : undefined,
  ]));
  const recommendations = gaps.map(({ key }) => ({ skill_key: key, action: byKey.get(key) }));
  if (recommendations.some(({ action }) => !action || action.length > 280 || /[<>\r\n]/u.test(action) ||
      (language === 'zh-CN' && !/\p{Script=Han}/u.test(action)))) return undefined;
  const uniqueActions = new Set(recommendations.map(({ action }) => action.normalize('NFKC').toLowerCase()
    .replace(/[\p{P}\s]/gu, '')));
  if (uniqueActions.size !== gaps.length) return undefined;
  return { recommendations };
}

export async function compareUserSkills(database, userId, raw) {
  const { career_ids: careerIds, language, include_ai: includeAi = true } =
    skillsBody(raw, ['career_ids', 'language', 'include_ai']);
  if (!Array.isArray(careerIds) || !careerIds.length || careerIds.length > MAX_CAREERS ||
      careerIds.some((id) => !Number.isInteger(id) || id < 1 || id > 2_147_483_647) ||
      new Set(careerIds).size !== careerIds.length) {
    throw skillsError(400, 'career_ids must contain 1 to 5 distinct positive career IDs');
  }
  if (language !== undefined && !['en', 'zh-CN'].includes(language)) throw skillsError(400, 'language must be en or zh-CN');
  if (typeof includeAi !== 'boolean') throw skillsError(400, 'include_ai must be a boolean');

  const { rows } = await database.query(
    'SELECT id, slug, title, market_pulse FROM career_roles WHERE is_active AND id = ANY($1::int[])',
    [careerIds],
  );
  if (rows.length !== careerIds.length) throw skillsError(404, 'One or more active careers were not found');
  const byId = new Map(rows.map((role) => [role.id, role]));
  const comparison = compareSkillsToCareers(await listUserSkills(database, userId), careerIds.map((id) => byId.get(id)));
  const { rows: profiles } = await database.query('SELECT preferred_language, career_goals FROM users WHERE id = $1', [userId]);
  const selectedLanguage = language || profiles[0]?.preferred_language || 'en';
  const gaps = comparison.prioritized_gaps.slice(0, MAX_GUIDANCE_GAPS);
  const base = { ...comparison, language: selectedLanguage };
  if (!gaps.length) {
    return { ...base, guidance: { status: 'not_needed', recommendations: [] } };
  }
  const result = includeAi ? await generateAssessmentJson({
    userId,
    beforeRequest: () => reserveDailyAiRequest(database, userId),
    schema: guidanceSchema,
    maxOutputTokens: 600,
    contents: assessmentPrompt(selectedLanguage, [
      'Write one practical improvement action, at most 280 characters, for each supplied skill gap.',
      'Tie actions to the selected careers and the user’s stated goal when helpful. Give each gap a distinct exercise with an observable outcome. Use the skill_key exactly as supplied.',
      'For unrated skills, suggest a brief self-assessment. Treat recorded proficiency as context and do not infer qualifications.',
      'Do not alter levels, priorities, or requirements. Return only the requested actions.',
    ], {
      goal: profiles[0]?.career_goals?.slice(0, 2000),
      careers: comparison.careers.map(({ id, title }) => ({ id, title })),
      gaps: gaps.map(({ key, name, status, current_level, evidence, career_ids }) =>
        ({ skill_key: key, name, status, current_level, evidence, career_ids })),
    }),
    validate: (value) => validateGuidance(value, gaps, selectedLanguage),
  }) : { status: 'skipped' };
  if (result.status === 'ai') return { ...base, guidance: result };
  return {
    ...base,
    guidance: {
      ...result,
      recommendations: gaps.map((gap) => ({ skill_key: gap.key, action: fallbackAction(gap, selectedLanguage) })),
    },
  };
}
