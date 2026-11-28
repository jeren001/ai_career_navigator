import { skillsError } from './user-skills.js';

export function inputText(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.includes('\0') || !value.isWellFormed() || [...value.trim()].length > max) {
    throw skillsError(400, `${field} must contain 1 to ${max} characters`);
  }
  return value.trim();
}

export function recordId(value, field = 'id') {
  if (typeof value !== 'string' || !/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(value)) {
    throw skillsError(400, `${field} must be a UUID`);
  }
  return value;
}

export function pageOffset(value) {
  if (value === undefined) return 0;
  if (typeof value !== 'string' || !/^\d{1,10}$/.test(value) || Number(value) > 2_147_483_647) {
    throw skillsError(400, 'offset must be a nonnegative integer');
  }
  return Number(value);
}

export function httpsUrl(value, field = 'url') {
  const text = inputText(value, field, 2048);
  let url;
  try {
    url = new URL(text);
  } catch {
    throw skillsError(400, `${field} must be an HTTPS URL`);
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 2048) {
    throw skillsError(400, `${field} must be an HTTPS URL without credentials`);
  }
  return url.href;
}
