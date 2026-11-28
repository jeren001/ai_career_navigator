import { httpsUrl, inputText } from './account-input.js';
import { catalogLanguage } from './challenge-catalog.js';
import { skillsError } from './user-skills.js';

export const jobKinds = ['job', 'internship'];

export async function searchVacancies(query, provider) {
  const language = catalogLanguage(query.language);
  const keyword = query.q === undefined ? undefined : inputText(query.q, 'q', 120);
  const location = query.location === undefined ? undefined : inputText(query.location, 'location', 120);
  const { kind, cursor } = query;
  if (kind !== undefined && !jobKinds.includes(kind)) throw skillsError(400, 'Invalid vacancy kind');
  if (cursor !== undefined) inputText(cursor, 'cursor', 512);
  if (!provider) return { availability: 'not_configured', language, vacancies: [], next_cursor: null };
  try {
    const signal = AbortSignal.timeout(5000);
    const page = await new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
      Promise.resolve().then(() => provider.search({ keyword, location, kind, language, cursor, limit: 20, signal }))
        .then(resolve, reject);
    });
    if (!Array.isArray(page.items) || page.items.length > 20) throw new Error('Invalid vacancy page');
    const vacancies = page.items.map((item) => {
      if (!jobKinds.includes(item.kind)) throw new Error('Invalid vacancy kind');
      return {
        provider: inputText(provider.id, 'provider', 80),
        external_id: inputText(item.external_id, 'external_id', 200),
        url: httpsUrl(item.url),
        title: inputText(item.title, 'title', 200),
        employer: item.employer == null ? null : inputText(item.employer, 'employer', 160),
        location: item.location == null ? null : inputText(item.location, 'location', 160),
        kind: item.kind,
      };
    });
    return {
      availability: 'available', language, vacancies,
      next_cursor: page.next_cursor == null ? null : inputText(page.next_cursor, 'next_cursor', 512),
    };
  } catch {
    throw skillsError(503, 'Vacancy provider unavailable');
  }
}
