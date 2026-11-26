import { randomUUID } from 'node:crypto';
import { getCareerMatch } from './career-match.js';
import { catalogLanguage } from './challenge-catalog.js';
import { resumeAdvice } from './resume-ai.js';
import { consentedResume } from './resumes.js';
import { planRoadmap } from './roadmap-plan.js';
import { compareSkillsToCareers } from './skill-comparison.js';
import { buildUserContext } from './user-context.js';
import { skillsBody, skillsError } from './user-skills.js';

const pageSize = 20;
const readRoadmaps = `
  SELECT r.id, r.assessment_session_id, r.language, r.profession, r.prioritized_skills,
         r.personalization, r.weekly_study_minutes, r.created_at,
         COALESCE(jsonb_agg(to_jsonb(m) - 'roadmap_id' ORDER BY m.position)
           FILTER (WHERE m.id IS NOT NULL), '[]'::jsonb) AS milestones
  FROM roadmaps r LEFT JOIN roadmap_milestones m ON m.roadmap_id = r.id
`;

function presentRoadmap(roadmap) {
  const { milestones, weekly_study_minutes: weeklyMinutes } = roadmap;
  const totalMinutes = milestones.reduce((sum, { estimated_minutes }) => sum + estimated_minutes, 0);
  const completed = milestones.filter(({ completed_at }) => completed_at !== null);
  return {
    ...roadmap,
    study_plan: {
      estimated_minutes: totalMinutes,
      estimated_weeks: Math.ceil(totalMinutes / weeklyMinutes),
    },
    progress: {
      completed_milestones: completed.length,
      total_milestones: milestones.length,
      completed_estimated_minutes: completed.reduce((sum, { estimated_minutes }) => sum + estimated_minutes, 0),
    },
  };
}

export async function readRoadmap(database, userId, id) {
  const { rows: [roadmap] } = await database.query(
    `${readRoadmaps} WHERE r.user_id = $1 AND r.id = $2 GROUP BY r.id`,
    [userId, id],
  );
  if (!roadmap) throw skillsError(404, 'Roadmap not found');
  return presentRoadmap(roadmap);
}

export async function listRoadmaps(database, userId, offset) {
  const { rows } = await database.query(
    `${readRoadmaps} WHERE r.user_id = $1 GROUP BY r.id
     ORDER BY r.created_at DESC, r.id DESC LIMIT $2 OFFSET $3`,
    [userId, pageSize + 1, offset],
  );
  return {
    roadmaps: rows.slice(0, pageSize).map(presentRoadmap),
    next_offset: rows.length > pageSize ? offset + pageSize : null,
  };
}

function validateMinutes(value, minimum, maximum, field) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw skillsError(400, `${field} must be an integer between ${minimum} and ${maximum}`);
  }
  return value;
}

export async function createRoadmap(database, userId, raw) {
  const { profession_slug: slug, language, weekly_study_minutes: weeklyMinutes = 180, resume_context: resumeContext } =
    skillsBody(raw, ['profession_slug', 'language', 'weekly_study_minutes', 'resume_context']);
  if (slug !== undefined && (typeof slug !== 'string' || slug.length > 100 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    throw skillsError(400, 'profession_slug must be a career slug');
  }
  validateMinutes(weeklyMinutes, 30, 2400, 'weekly_study_minutes');
  if (language !== undefined) catalogLanguage(language);
  const resume = await consentedResume(database, userId, resumeContext);

  const match = await getCareerMatch(database, userId);
  const role = slug === undefined ? match.professions[0] : match.professions.find((profession) => profession.slug === slug);
  if (!role) throw skillsError(404, 'Profession not found in the latest Career Match');
  const { profile } = await buildUserContext(database, userId, { loadAssessment: false });
  const selectedLanguage = catalogLanguage(language ?? profile?.preferred_language ?? match.language);
  const translation = role.market_pulse?.translations?.[selectedLanguage];
  const profession = { id: role.id, slug: role.slug, title: translation?.title ?? role.title };
  // A Chinese saved match already has localized top-level titles. Use the catalog
  // title when a user requests English for that match.
  if (selectedLanguage === 'en' && match.language === 'zh-CN') {
    const { rows: [catalogRole] } = await database.query('SELECT title FROM career_roles WHERE id = $1', [role.id]);
    profession.title = catalogRole?.title ?? profession.title;
  }
  const comparison = compareSkillsToCareers(match.skills, [role], selectedLanguage);
  const prioritizedSkills = (comparison.prioritized_gaps.length
    ? comparison.prioritized_gaps
    : comparison.careers[0].requirements).slice(0, 6)
    .map(({ key, name, priority, status, evidence, current_level }) =>
      ({ key, name, priority, status, evidence, current_level }));
  const plan = await planRoadmap(database, {
    userId, role, profession, language: selectedLanguage, weeklyMinutes, profile, match, skills: match.skills, prioritizedSkills,
  });
  const id = randomUUID();
  await database.query(
    `WITH saved AS (
       INSERT INTO roadmaps (id, user_id, assessment_session_id, language, profession,
         prioritized_skills, personalization, weekly_study_minutes)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8)
       RETURNING id
     )
     INSERT INTO roadmap_milestones
       (id, roadmap_id, position, title, action, outcome, estimated_minutes, resources, challenges, skill_keys)
     SELECT m.id, saved.id, m.position, m.title, m.action, m.outcome, m.estimated_minutes, m.resources, m.challenges, m.skill_keys
     FROM saved CROSS JOIN jsonb_to_recordset($9::jsonb) AS m(
       id uuid, position smallint, title text, action text, outcome text, estimated_minutes integer,
       resources jsonb, challenges jsonb, skill_keys text[]
     )`,
    [id, userId, match.assessment_session_id, selectedLanguage, JSON.stringify(profession),
      JSON.stringify(prioritizedSkills), JSON.stringify(plan.personalization), weeklyMinutes,
      JSON.stringify(plan.milestones.map((milestone) => ({ ...milestone, id: randomUUID() })))],
  );
  const roadmap = await readRoadmap(database, userId, id);
  if (resume) {
    roadmap.resume_guidance = await resumeAdvice(database, userId, resume, 'my_roadmap', {
      profession: profession.title,
      weekly_study_minutes: weeklyMinutes,
      prioritized_skills: prioritizedSkills.map(({ name }) => name),
    }, selectedLanguage);
  }
  return roadmap;
}

function validateText(value, limit, field) {
  if (typeof value !== 'string' || value.includes('\0') || !value.trim() || value.trim().length > limit) {
    throw skillsError(400, `${field} must be nonempty text of at most ${limit} characters`);
  }
  return value.trim();
}

export async function updateMilestone(database, userId, roadmapId, milestoneId, raw) {
  const fields = ['title', 'action', 'outcome', 'estimated_minutes', 'notes', 'completed'];
  const body = skillsBody(raw, fields);
  if (!Object.keys(body).length) throw skillsError(400, 'Supply at least one milestone field');
  const { title, action, outcome, estimated_minutes: minutes, notes, completed } = body;
  const hasNotes = Object.hasOwn(body, 'notes');
  if (completed !== undefined && typeof completed !== 'boolean') throw skillsError(400, 'completed must be a boolean');
  const updated = await database.query(
    `UPDATE roadmap_milestones AS m
     SET title = COALESCE($4, m.title), action = COALESCE($5, m.action), outcome = COALESCE($6, m.outcome),
         estimated_minutes = COALESCE($7, m.estimated_minutes),
         notes = CASE WHEN $8 THEN $9 ELSE m.notes END,
         completed_at = CASE WHEN $10::boolean IS TRUE THEN COALESCE(m.completed_at, clock_timestamp())
            WHEN $10 IS FALSE THEN NULL ELSE m.completed_at END,
         updated_at = clock_timestamp()
     FROM roadmaps r WHERE r.user_id = $1 AND r.id = $2 AND m.roadmap_id = r.id AND m.id = $3`,
    [userId, roadmapId, milestoneId,
      title === undefined ? null : validateText(title, 120, 'title'),
      action === undefined ? null : validateText(action, 400, 'action'),
      outcome === undefined ? null : validateText(outcome, 240, 'outcome'),
      minutes === undefined ? null : validateMinutes(minutes, 5, 2400, 'estimated_minutes'),
      hasNotes, notes == null ? null : validateText(notes, 1000, 'notes'), completed ?? null],
  );
  if (!updated.rowCount) throw skillsError(404, 'Roadmap milestone not found');
  return readRoadmap(database, userId, roadmapId);
}
