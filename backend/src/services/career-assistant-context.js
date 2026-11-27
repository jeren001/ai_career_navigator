import { challengeProgress } from './practical-challenges.js';
import { latestCompletedAssessment } from './user-context.js';
import { listUserSkills } from './user-skills.js';

export const contextSources = ['profile', 'assessment', 'career_match', 'skills', 'roadmap', 'practice'];

function shortText(value) {
  return typeof value === 'string' ? value.slice(0, 240) : null;
}

async function profileContext(database, userId) {
  const { rows: [profile] } = await database.query(
    'SELECT country, education, work_experience, interests, career_goals FROM users WHERE id = $1',
    [userId],
  );
  if (!profile) return undefined;
  const context = {
    country: shortText(profile.country),
    education: shortText(profile.education),
    self_reported_experience: shortText(profile.work_experience),
    interests: profile.interests.slice(0, 10).map(shortText),
    goals: shortText(profile.career_goals),
  };
  return Object.values(context).some((value) => value?.length) ? context : undefined;
}

function matchContext(assessment) {
  const roles = assessment?.career_match?.professions ?? assessment?.recommended_roles ?? [];
  if (!roles.length) return undefined;
  return roles.slice(0, 5).map(({ slug, title, reason }) => ({
    slug, title: shortText(title), suggested_fit: shortText(reason),
  }));
}

function roadmapContext(assessment) {
  const steps = assessment?.career_match?.personalization?.roadmap;
  if (!steps?.length) return undefined;
  return steps.slice(0, 5).map(({ phase, action, outcome }) => ({
    phase: shortText(phase), action: shortText(action), outcome: shortText(outcome),
  }));
}

async function skillsContext(database, userId) {
  const skills = await listUserSkills(database, userId);
  if (!skills.length) return undefined;
  return skills.slice(0, 15).map(({ name, self_assessment, practical_assessment }) => ({
    name,
    self_reported_level: self_assessment?.level ?? null,
    practice_level: practical_assessment?.level ?? null,
  }));
}

async function practiceContext(database, userId) {
  const challenges = await challengeProgress(database, userId);
  const { rows: interviews } = await database.query(
    `SELECT profession->>'title' AS profession, difficulty, evaluation IS NOT NULL AS feedback_available
     FROM interview_sessions WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 5`,
    [userId],
  );
  if (!challenges.length && !interviews.length) return undefined;
  return {
    challenges: challenges.slice(0, 8).map(({ challenge_id, submitted_count, evaluated_count }) => ({
      challenge_id, submitted_count, evaluated_count,
    })),
    interviews: interviews.map((item) => ({ ...item, profession: shortText(item.profession) })),
  };
}

export async function assistantContext(database, userId, sources) {
  const assessment = sources.some((source) => ['assessment', 'career_match', 'roadmap'].includes(source))
    ? await latestCompletedAssessment(database, userId)
    : null;
  const loaders = {
    profile: () => profileContext(database, userId),
    assessment: () => assessment ? { traits: assessment.trait_scores } : undefined,
    career_match: () => matchContext(assessment),
    skills: () => skillsContext(database, userId),
    roadmap: () => roadmapContext(assessment),
    practice: () => practiceContext(database, userId),
  };
  const entries = await Promise.all(sources.map(async (source) => [source, await loaders[source]()]));
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined));
}
