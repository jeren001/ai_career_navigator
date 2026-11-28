import catalog from '../../database/skill-challenges.json' with { type: 'json' };
import learningHub from '../../database/learning-hub-resources.json' with { type: 'json' };
import { skillKey, skillsError } from './user-skills.js';

const challenges = new Map(catalog.challenges.map((challenge) => [challenge.id, challenge]));
const resourcesById = new Map(learningHub.resources.map((resource) => [resource.id, resource]));
export const challengeSkillKey = (name) => skillKey(name.replace(/-/g, ' '));

export function catalogLanguage(language) {
  if (language === undefined) return 'en';
  if (language !== 'en' && language !== 'zh-CN') throw skillsError(400, 'language must be en or zh-CN');
  return language;
}

function localizedChallenge(challenge, language) {
  return {
    id: challenge.id,
    career_field: challenge.careerField,
    profession_slugs: challenge.professionSlugs,
    skills: challenge.skills,
    difficulty: challenge.difficulty,
    estimated_minutes: challenge.estimatedMinutes,
    title: challenge.title[language],
    description: challenge.description[language],
    instructions: challenge.instructions[language],
    expected_deliverable: challenge.expectedDeliverable[language],
    rubric: {
      max_points: challenge.rubric.maxPoints,
      criteria: challenge.rubric.criteria.map(({ id, points, fullCreditWhen }) =>
        ({ id, points, full_credit_when: fullCreditWhen[language] })),
    },
  };
}

export function challengeById(id, language) {
  const challenge = challenges.get(id);
  if (!challenge) throw skillsError(404, 'Challenge not found');
  return localizedChallenge(challenge, language);
}

export function challengePracticeDetails(id, language) {
  const challenge = challenges.get(id);
  return {
    title: challenge?.title[language] ?? null,
    skill_keys: challenge ? [...new Set(challenge.skills.map(challengeSkillKey))] : [],
  };
}

function filterText(value, field) {
  if (value !== undefined && (typeof value !== 'string' || !value.trim() || value.length > 120)) {
    throw skillsError(400, `${field} must be a nonempty string of at most 120 characters`);
  }
  return value?.trim();
}

export function discoverChallenges(query) {
  const language = catalogLanguage(query.language);
  const profession = filterText(query.profession_slug, 'profession_slug');
  const field = filterText(query.career_field, 'career_field');
  const skill = filterText(query.skill, 'skill');
  const difficulty = filterText(query.difficulty, 'difficulty');
  if (difficulty && !['beginner', 'intermediate', 'advanced'].includes(difficulty)) {
    throw skillsError(400, 'difficulty must be beginner, intermediate, or advanced');
  }
  const key = skill && challengeSkillKey(skill);
  const matches = catalog.challenges.filter((challenge) =>
    (!profession || challenge.professionSlugs.includes(profession)) &&
    (!field || challenge.careerField === field) &&
    (!key || challenge.skills.some((name) => challengeSkillKey(name) === key)) &&
    (!difficulty || challenge.difficulty === difficulty));
  return { language, challenges: matches.map((challenge) => localizedChallenge(challenge, language)) };
}

export function challengeDetail(id, language) {
  return {
    language,
    challenge: challengeById(id, language),
    execution_guidance: catalog.executionGuidance[language],
    rubric_interpretation: catalog.rubricPolicy.interpretation[language],
  };
}

function localizedResource(resource, language) {
  return { ...resource, title: resource.title[language], description: resource.description[language] };
}

export function learningResource(id, language) {
  const resource = resourcesById.get(id);
  return resource && localizedResource(resource, language);
}

export function discoverResources(query) {
  const language = catalogLanguage(query.language);
  const field = filterText(query.career_field, 'career_field');
  const skill = filterText(query.skill, 'skill');
  const key = skill && challengeSkillKey(skill);
  const resources = learningHub.resources.filter((resource) =>
    (!field || resource.careerFields.includes(field)) &&
    (!key || [...resource.skills, ...resource.catalogSkillMatches].some((name) => challengeSkillKey(name) === key)));
  return {
    language,
    resources: resources.map((resource) => localizedResource(resource, language)),
  };
}
