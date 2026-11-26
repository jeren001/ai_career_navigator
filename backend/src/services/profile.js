const LANGUAGES = new Set(['en', 'zh-CN']);
const AGE_GROUPS = new Set(['under_18', '18_24', '25_34', '35_44', '45_plus', 'prefer_not_to_say']);
const profileTextFields = {
  display_name: 120, first_name: 120, last_name: 120, country: 100, city: 100,
  current_status: 120, about_me: 500, education: 2000, work_experience: 2000, career_goals: 2000,
};
export const profileColumns = `id, email, username, display_name, first_name, last_name, country, city,
  date_of_birth::text AS date_of_birth, current_status, about_me, preferred_language, age_group, education,
  work_experience, interests, skills, career_goals, is_guest, created_at, email_verified_at,
  profile_photo IS NOT NULL AS has_profile_photo`;

export function normalizeUsername(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^[a-z0-9_.]{3,20}$/i.test(value)) {
    throw validationError('username must contain 3 to 20 ASCII letters, numbers, underscores or dots');
  }
  return value.toLowerCase();
}

function validationError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function optionalText(value, field, maxLength) {
  if (value === null || value === '') return null;
  if (typeof value !== 'string' || value.includes('\0') || value.trim().length > maxLength) {
    throw validationError(`${field} must be a string with at most ${maxLength} characters`);
  }
  return value.trim() || null;
}

function optionalTextArray(value, field) {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || !item.trim() || item.includes('\0') || item.length > 100)) {
    throw validationError(`${field} must be an array of up to 30 non-empty strings of at most 100 characters`);
  }
  return [...new Set(value.map((item) => item.trim()))];
}

export function validateProfileUpdate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw validationError('Request body must be an object');
  const fields = {};
  for (const [field, limit] of Object.entries(profileTextFields)) {
    if (field in body) fields[field] = optionalText(body[field], field, limit);
  }
  if ('username' in body) fields.username = normalizeUsername(body.username);
  if ('date_of_birth' in body) {
    const value = optionalText(body.date_of_birth, 'date_of_birth', 10);
    if (value !== null) {
      const date = new Date(value);
      const today = new Date().toISOString().slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime()) ||
          date.toISOString().slice(0, 10) !== value || value < '1900-01-01' || value > today) {
        throw validationError('date_of_birth must be a valid YYYY-MM-DD date from 1900 through today');
      }
    }
    fields.date_of_birth = value;
  }
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
  for (const field of ['interests', 'skills']) {
    const value = optionalTextArray(body[field], field);
    if (value !== undefined) fields[field] = value;
  }
  if (Object.keys(fields).length === 0) throw validationError('Provide at least one profile field to update');
  return fields;
}

export function profileUpdateSql(userId, fields) {
  const updates = [];
  const values = [userId];
  for (const [field, value] of Object.entries(fields)) {
    values.push(value);
    updates.push(`${field} = $${values.length}${Array.isArray(value) ? '::text[]' : ''}`);
  }
  if (!('display_name' in fields) && ('first_name' in fields || 'last_name' in fields)) {
    const columnValue = (key) => {
      const index = Object.keys(fields).indexOf(key);
      return index < 0 ? key : `$${index + 2}::text`;
    };
    updates.push(`display_name = NULLIF(left(concat_ws(' ', ${columnValue('first_name')}, ${columnValue('last_name')}), 120), '')`);
  }
  return {
    text: `UPDATE users SET ${updates.join(', ')} WHERE id = $1 RETURNING ${profileColumns}`,
    values,
  };
}

export function publicProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    display_name: row.display_name,
    username: row.username ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    city: row.city ?? null,
    date_of_birth: row.date_of_birth ?? null,
    current_status: row.current_status ?? null,
    about_me: row.about_me ?? null,
    profile_photo_url: row.has_profile_photo ? '/api/profile/photo' : null,
    email_verified_at: row.email_verified_at ?? null,
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
  if (email.length > 254 || !/^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$/.test(email)) throw validationError('email must be valid');
  return email;
}

export function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) {
    throw validationError('password must contain between 10 and 128 characters');
  }
  return value;
}
