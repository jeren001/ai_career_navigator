const LANGUAGES = new Set(['en', 'zh-CN']);
const AGE_GROUPS = new Set(['under_18', '18_24', '25_34', '35_44', '45_plus', 'prefer_not_to_say']);

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function optionalText(value, field, maxLength) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.trim().length > maxLength) {
    throw validationError(`${field} must be a string with at most ${maxLength} characters`);
  }
  return value.trim() || null;
}

function optionalTextArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || !item.trim() || item.length > 100)) {
    throw validationError(`${field} must be an array of up to 30 non-empty strings of at most 100 characters`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}

export function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('Request body must be an object');
  const fields = {};
  if ('display_name' in body) fields.display_name = optionalText(body.display_name, 'display_name', 120);
  if ('country' in body) fields.country = optionalText(body.country, 'country', 100);
  if ('preferred_language' in body) {
    const value = optionalText(body.preferred_language, 'preferred_language', 10);
    if (value !== null && !LANGUAGES.has(value)) throw validationError('preferred_language must be en or zh-CN');
    fields.preferred_language = value || 'en';
  }
  if ('age_group' in body) {
    const value = optionalText(body.age_group, 'age_group', 30);
    if (value !== null && !AGE_GROUPS.has(value)) throw validationError('age_group must be a supported age group');
    fields.age_group = value;
  }
  for (const field of ['education', 'work_experience', 'career_goals']) {
    if (field in body) fields[field] = optionalText(body[field], field, 2000);
  }
  for (const field of ['interests', 'skills']) {
    const value = optionalTextArray(body[field], field);
    if (value !== undefined) fields[field] = value;
  }
  if (Object.keys(fields).length === 0) throw validationError('Provide at least one profile field to update');
  return fields;
}

export function profileUpdateSql(userId, fields) {
  const columnMap = { display_name: 'display_name', country: 'country', preferred_language: 'preferred_language', age_group: 'age_group', education: 'education', work_experience: 'work_experience', interests: 'interests', skills: 'skills', career_goals: 'career_goals' };
  const updates = [];
  const values = [userId];
  for (const [field, value] of Object.entries(fields)) {
    values.push(value);
    updates.push(`${columnMap[field]} = $${values.length}${Array.isArray(value) ? '::text[]' : ''}`);
  }
  return {
    text: `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING id, email, display_name, country, preferred_language, age_group, education, work_experience, interests, skills, career_goals, is_guest, created_at`,
    values,
  };
}

export function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    country: row.country ?? null,
    preferred_language: row.preferred_language || 'en',
    age_group: row.age_group ?? null,
    education: row.education ?? null,
    work_experience: row.work_experience ?? null,
    interests: row.interests || [],
    skills: row.skills || [],
    career_goals: row.career_goals ?? null,
    is_guest: row.is_guest,
    created_at: row.created_at,
  };
}

export function normalizeEmail(value) {
  if (typeof value !== 'string') throw validationError('email is required');
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw validationError('email must be valid');
  return email;
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) {
    throw validationError('password must contain between 10 and 128 characters');
  }
  return value;
}
