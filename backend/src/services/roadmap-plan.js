import { reserveDailyAiRequest } from './ai-limits.js';
import { generateAssessmentJson } from './assessment-ai.js';
import { assessmentPrompt } from './assessment-prompts.js';
import { challengeSkillKey, discoverChallenges, discoverResources } from './challenge-catalog.js';
import { unsafeClaim } from './gemini.js';

const stageTitles = {
  en: ['Build foundations', 'Practice a career task', 'Document and review'],
  'zh-CN': ['夯实基础', '练习职业任务', '记录成果并复盘'],
};
const textLimits = { action: 400, outcome: 240 };

function chooseResource(resources, keys, language, used) {
  const ranked = resources.filter(({ id }) => !used.has(id)).map((resource) => {
    const matches = new Set([...resource.catalogSkillMatches, ...resource.skills].map(challengeSkillKey));
    const overlap = keys.filter((key) => matches.has(key)).length;
    const edition = resource.languageEditions.find((item) => item.language === language) ?? resource.languageEditions[0];
    return { resource, edition, overlap, focusMatch: matches.has(keys[0]) };
  }).filter(({ overlap, edition }) => overlap > 0 && edition)
    .sort((a, b) => Number(b.focusMatch) - Number(a.focusMatch) || b.overlap - a.overlap ||
      Number(b.edition.language === language) - Number(a.edition.language === language) ||
      Number(b.resource.access.type === 'free') - Number(a.resource.access.type === 'free'));
  if (!ranked.length) return [];
  const { resource, edition } = ranked[0];
  used.add(resource.id);
  return [{
    id: resource.id, title: resource.title, provider: resource.provider, url: edition.url,
    learning_language: edition.language, access_type: resource.access.type,
    provider_estimated_minutes: resource.studyTime?.estimatedMinutes ?? null,
  }];
}

function chooseChallenge(challenges, keys, slug, history) {
  const ranked = challenges.map((challenge) => {
    const overlap = challenge.skills.map(challengeSkillKey).filter((key) => keys.has(key)).length;
    const professionMatch = challenge.profession_slugs.includes(slug);
    const prior = history.get(challenge.id);
    return { challenge, overlap, professionMatch, prior };
  }).filter(({ overlap, professionMatch }) => overlap || professionMatch)
    .sort((a, b) => Number(b.professionMatch) - Number(a.professionMatch) ||
      b.overlap - a.overlap || Number(Boolean(a.prior)) - Number(Boolean(b.prior)));
  if (!ranked.length) return [];
  const { challenge, prior } = ranked[0];
  return [{
    id: challenge.id, title: challenge.title, difficulty: challenge.difficulty,
    estimated_minutes: challenge.estimated_minutes, expected_deliverable: challenge.expected_deliverable,
    prior_submissions: prior?.submitted_count ?? 0, prior_evaluations: prior?.evaluated_count ?? 0,
  }];
}

function ruleBasedMilestone(index, language, focus, resource, challenge) {
  if (language === 'zh-CN') {
    return [
      { action: resource ? `选学《${resource.title}》中与${focus}相关的一小节，并做一个示例。` : `为${focus}做一个入门示例，并记录操作步骤。`, outcome: '一个可复现的示例和三条学习笔记。' },
      { action: challenge ? `${challenge.prior_submissions ? '重做' : '完成'}「${challenge.title}」，并按挑战评分标准检查成果。` : `围绕${focus}完成一个小型模拟任务，并记录你的选择。`, outcome: challenge?.expected_deliverable ?? '一份练习成果和一项待改进之处。' },
      { action: `整理${focus}的练习成果，说明你的做法，并修订一个薄弱环节。`, outcome: '一份简短的作品说明和一项有记录的改进。' },
    ][index];
  }
  return [
    { action: resource ? `Study one section of ${resource.title} on ${focus} and try an example.` : `Work through a small example of ${focus} and record the steps.`, outcome: 'One reproducible example and three study notes.' },
    { action: challenge ? `${challenge.prior_submissions ? 'Revisit' : 'Complete'} ${challenge.title} and review the result against its rubric.` : `Complete a small simulated task using ${focus} and record your choices.`, outcome: challenge?.expected_deliverable ?? 'One practice artifact and one improvement to make.' },
    { action: `Summarize your ${focus} practice, explain your approach, and revise one weak spot.`, outcome: 'A short portfolio note and one documented revision.' },
  ][index];
}

const schema = {
  type: 'object',
  properties: {
    milestones: {
      type: 'array', minItems: 3, maxItems: 3,
      items: {
        type: 'object',
        properties: { position: { type: 'integer', enum: [1, 2, 3] }, action: { type: 'string' }, outcome: { type: 'string' } },
        required: ['position', 'action', 'outcome'],
      },
    },
  },
  required: ['milestones'],
};

function validatedMilestones(value, language) {
  if (!Array.isArray(value?.milestones) || value.milestones.length !== 3) return undefined;
  const sorted = [...value.milestones].sort((a, b) => a?.position - b?.position);
  const valid = sorted.every((item, index) => item?.position === index + 1 &&
    Object.entries(textLimits).every(([field, limit]) => {
      const content = item[field];
      return typeof content === 'string' && content.trim().length && content.length <= limit &&
        !/[<>\r\n\0]|https?:|www\./iu.test(content) && !unsafeClaim(content) &&
        (language !== 'zh-CN' || /\p{Script=Han}/u.test(content));
    }));
  if (!valid) return undefined;
  const descriptions = sorted.map(({ action, outcome }) => ({ action: action.trim(), outcome: outcome.trim() }));
  if (new Set(descriptions.map(({ action }) => action.normalize('NFKC').toLowerCase().replace(/[\p{P}\s]/gu, ''))).size !== 3) return undefined;
  return { descriptions };
}

export async function planRoadmap(database, {
  userId, role, profession, language, weeklyMinutes, profile, match, skills, prioritizedSkills,
}) {
  const field = role.market_pulse?.career_field ?? role.market_pulse?.careerField;
  const resources = field ? discoverResources({ language, career_field: field }).resources : [];
  const countryCode = /^[a-z]{2}$/i.test(profile?.country) ? profile.country.toUpperCase() : null;
  const eligibleResources = resources.filter(({ geography }) =>
    (!geography.contentJurisdictions.length || geography.contentJurisdictions.includes(countryCode)) &&
    (!geography.availabilityCountries || geography.availabilityCountries.includes(countryCode)));
  const challenges = field ? discoverChallenges({ language, career_field: field }).challenges : [];
  const history = new Map(match.challenge_practice.history.map((item) => [item.challenge_id, item]));
  const usedResources = new Set();
  const rankedKeys = prioritizedSkills.map(({ key }) => key);
  const milestones = stageTitles[language].map((title, index) => {
    const focusSkill = prioritizedSkills[index % (prioritizedSkills.length || 1)];
    const keys = focusSkill ? [focusSkill.key, ...rankedKeys.filter((key) => key !== focusSkill.key)] : [];
    const suggestedResources = index === 1 ? [] : chooseResource(eligibleResources, keys, language, usedResources);
    const suggestedChallenges = index === 1 ? chooseChallenge(challenges, new Set(keys), profession.slug, history) : [];
    const focus = focusSkill?.name ?? profession.title;
    const estimate = [60, 90, 45][index];
    return {
      position: index + 1, title, skill_keys: focusSkill ? [focusSkill.key] : [],
      ...ruleBasedMilestone(index, language, focus, suggestedResources[0], suggestedChallenges[0]),
      estimated_minutes: Math.max(suggestedChallenges[0]?.estimated_minutes ?? 0, Math.min(weeklyMinutes, estimate)),
      resources: suggestedResources, challenges: suggestedChallenges,
    };
  });
  const ai = await generateAssessmentJson({
    userId, schema, maxOutputTokens: 750, maxAttempts: 2, waitForSlot: true,
    beforeRequest: () => reserveDailyAiRequest(database, userId),
    contents: assessmentPrompt(language, [
      'Personalize the action and observable outcome for each of the three supplied learning milestones; keep their positions and progression.',
      'Ground the steps in relevant goals, interests, available time, and skill gaps. Use distinct, concrete, achievable tasks.',
      'For a stage with a supplied resource or challenge, use its title and respect the expected deliverable; do not introduce other resources, URLs, credentials, or claims of proficiency.',
      'Use challenge history only to vary the practice or suggest revision. Counts record activity and do not indicate skill level. Use fictional or public, non-sensitive material for practice.',
      'Use one short sentence per field and return only position, action and outcome for each milestone.',
    ], {
      profession,
      profile: {
        career_goals: profile?.career_goals?.slice(0, 500), education: profile?.education?.slice(0, 300),
        work_experience: profile?.work_experience?.slice(0, 300), interests: profile?.interests?.slice(0, 8),
      },
      assessment: { reason: role.reason, guidance: role.ai_explanation },
      weekly_study_minutes: weeklyMinutes,
      prioritized_skills: prioritizedSkills,
      recorded_skills: skills.slice(0, 12).map(({ name, self_assessment, practical_assessment }) => ({
        name, self_reported_level: self_assessment?.level ?? null, practical_level: practical_assessment?.level ?? null,
      })),
      prior_practice: [...history.values()].slice(0, 8).map(({ title, skill_keys, submitted_count, evaluated_count }) =>
        ({ title, skill_keys, submitted_count, evaluated_count })),
      milestones: milestones.map(({ resources: shortlist, ...milestone }) => ({
        ...milestone, resources: shortlist.map(({ id, title }) => ({ id, title })),
      })),
    }),
    validate: (value) => validatedMilestones(value, language),
  });
  const { descriptions, ...personalization } = ai;
  return {
    personalization,
    milestones: descriptions ? milestones.map((milestone, index) => ({ ...milestone, ...descriptions[index] })) : milestones,
  };
}
