import { randomUUID } from 'node:crypto';
import { extractResumeText } from './resume-extraction.js';
import { skillsBody, skillsError } from './user-skills.js';

export const resumeSections = ['skills', 'education', 'work_experience', 'projects', 'certifications'];
const columns = 'id, title, language, sections, file_media_type, extracted_text, created_at, updated_at';
const emptySections = Object.fromEntries(resumeSections.map((section) => [section, []]));

export function resumeUuid(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value)) {
    throw skillsError(400, 'Resume ID must be a UUID');
  }
  return value;
}

function resumeText(value, limit, field) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || [...value].length > limit) {
    throw skillsError(400, field + ' must contain 1 to ' + limit + ' characters');
  }
  return value.trim();
}

function checkLanguage(value) {
  if (value !== undefined && value !== 'en' && value !== 'zh-CN') {
    throw skillsError(400, 'language must be en or zh-CN');
  }
  return value;
}

function readSections(value) {
  if (value === undefined) return {};
  const sections = skillsBody(value, resumeSections);
  return Object.fromEntries(Object.entries(sections).map(([name, entries]) => {
    if (!Array.isArray(entries) || entries.length > 25) {
      throw skillsError(400, name + ' must be an array of up to 25 entries');
    }
    return [name, entries.map((entry) => {
      const { name: label, organization, dates, details } = skillsBody(entry, ['name', 'organization', 'dates', 'details']);
      return {
        name: resumeText(label, 120, 'name'),
        ...(organization !== undefined && { organization: resumeText(organization, 120, 'organization') }),
        ...(dates !== undefined && { dates: resumeText(dates, 80, 'dates') }),
        ...(details !== undefined && { details: resumeText(details, 500, 'details') }),
      };
    })];
  }));
}

export async function readResume(database, userId, id) {
  const { rows: [resume] } = await database.query(
    'SELECT ' + columns + ' FROM resumes WHERE user_id = $1 AND id = $2', [userId, id],
  );
  if (!resume) throw skillsError(404, 'Resume not found');
  return resume;
}

export async function listResumes(database, userId, offset) {
  const { rows } = await database.query(
    'SELECT id, title, language, file_media_type, created_at, updated_at FROM resumes ' +
    'WHERE user_id = $1 ORDER BY created_at DESC, id DESC LIMIT 21 OFFSET $2', [userId, offset],
  );
  return { resumes: rows.slice(0, 20), next_offset: rows.length > 20 ? offset + 20 : null };
}

export async function createResume(database, userId, raw, upload) {
  const { title, language, sections } = skillsBody(raw, ['title', 'language', 'sections']);
  const selectedLanguage = checkLanguage(language);
  const label = title === undefined && upload ? null : resumeText(title, 120, 'title');
  const data = { ...emptySections, ...readSections(sections) };
  const extractedText = upload ? await extractResumeText(upload.buffer, upload.mediaType) : null;
  const { rows: [resume] } = await database.query(
    'INSERT INTO resumes (id, user_id, title, language, sections, file_media_type, file_content, extracted_text) ' +
    "SELECT $1, id, COALESCE($3, CASE WHEN COALESCE($4, preferred_language) = 'zh-CN' THEN '简历' ELSE 'Resume' END), " +
    'COALESCE($4, preferred_language), $5::jsonb, $6, $7, $8 FROM users WHERE id = $2 AND NOT is_guest RETURNING ' + columns,
    [randomUUID(), userId, label, selectedLanguage ?? null, JSON.stringify(data),
      upload?.mediaType ?? null, upload?.buffer ?? null, extractedText],
  );
  if (!resume) throw skillsError(401, 'Authentication required');
  return resume;
}

export async function updateResume(database, userId, id, raw) {
  const { title, language, sections } = skillsBody(raw, ['title', 'language', 'sections']);
  if (!Object.keys(raw).length) throw skillsError(400, 'Supply at least one resume field');
  const { rows: [resume] } = await database.query(
    'UPDATE resumes SET title = COALESCE($3, title), language = COALESCE($4, language), ' +
    'sections = sections || $5::jsonb, updated_at = clock_timestamp() ' +
    'WHERE user_id = $1 AND id = $2 RETURNING ' + columns,
    [userId, id, title === undefined ? null : resumeText(title, 120, 'title'),
      checkLanguage(language) ?? null, JSON.stringify(readSections(sections))],
  );
  if (!resume) throw skillsError(404, 'Resume not found');
  return resume;
}

export async function downloadResume(database, userId, id) {
  const { rows: [file] } = await database.query(
    'SELECT file_content, file_media_type FROM resumes WHERE user_id = $1 AND id = $2 AND file_content IS NOT NULL',
    [userId, id],
  );
  if (!file) throw skillsError(404, 'Resume file not found');
  return file;
}

export async function deleteResume(database, userId, id) {
  const { rowCount } = await database.query('DELETE FROM resumes WHERE user_id = $1 AND id = $2', [userId, id]);
  if (!rowCount) throw skillsError(404, 'Resume not found');
}

export async function consentedResume(database, userId, raw) {
  if (raw === undefined) return undefined;
  const { resume_id: id, consent } = skillsBody(raw, ['resume_id', 'consent']);
  if (consent !== true) throw skillsError(400, 'Resume personalization requires explicit consent');
  return readResume(database, userId, resumeUuid(id));
}
