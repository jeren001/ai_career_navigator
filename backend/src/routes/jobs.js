import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { httpsUrl, inputText, pageOffset, recordId } from '../services/account-input.js';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { searchVacancies } from '../services/job-search.js';
import { skillsBody, skillsError } from '../services/user-skills.js';

const statuses = ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'];
const fields = 'id, url, title, employer, location, status, notes, applied_on::text AS applied_on, created_at, updated_at';
const optionalText = (value, field, limit) => value == null ? null : inputText(value, field, limit);

function appliedDate(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) {
    throw skillsError(400, 'applied_on must be a calendar date in YYYY-MM-DD format');
  }
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(+date) || date.toISOString().slice(0, 10) !== value) throw skillsError(400, 'Invalid applied_on date');
  return value;
}

export default function createJobsRouter(database, provider) {
  const router = Router();
  router.get('/search', async (request, response, next) => {
    try {
      response.json(await searchVacancies(request.query, provider));
    } catch (error) {
      next(error);
    }
  });

  router.use('/saved', optionalAuthentication(database), requireAuthentication);
  function handle(operation) {
    return async (request, response, next) => {
      response.set('Cache-Control', 'private, no-store');
      try {
        await operation(request, response, request.auth.userId);
      } catch (error) {
        next(error);
      }
    };
  }

  router.post('/saved', handle(async (request, response, userId) => {
    const { url, title, employer, location, notes } = skillsBody(request.body, ['url', 'title', 'employer', 'location', 'notes']);
    const { rows: [job] } = await database.query(
      `WITH job AS (
         INSERT INTO saved_jobs (id, user_id, url, title, employer, location, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, url) DO NOTHING RETURNING ${fields}
       ), event AS (
         INSERT INTO saved_job_events (job_id, status) SELECT id, status FROM job
       )
       SELECT * FROM job`,
      [randomUUID(), userId, httpsUrl(url), inputText(title, 'title', 200),
        optionalText(employer, 'employer', 160), optionalText(location, 'location', 160), optionalText(notes, 'notes', 4000)],
    );
    if (!job) throw skillsError(409, 'Job URL is already saved');
    response.status(201).json({ job });
  }));

  router.get('/saved', handle(async (request, response, userId) => {
    const offset = pageOffset(request.query.offset);
    const { status } = request.query;
    if (status !== undefined && !statuses.includes(status)) throw skillsError(400, 'Invalid application status');
    const { rows } = await database.query(
      `SELECT ${fields} FROM saved_jobs WHERE user_id = $1 AND ($2::text IS NULL OR status = $2)
       ORDER BY updated_at DESC, id DESC LIMIT 21 OFFSET $3`, [userId, status ?? null, offset],
    );
    response.json({ jobs: rows.slice(0, 20), next_offset: rows.length > 20 ? offset + 20 : null });
  }));

  router.get('/saved/:id', handle(async (request, response, userId) => {
    const { rows: [job] } = await database.query(
      `SELECT ${fields}, (
           SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'job_id' - 'id' ORDER BY id), '[]')
           FROM saved_job_events e WHERE e.job_id = j.id
         ) AS history
       FROM saved_jobs j WHERE user_id = $1 AND id = $2`, [userId, recordId(request.params.id)],
    );
    if (!job) throw skillsError(404, 'Saved job not found');
    response.json({ job });
  }));

  router.patch('/saved/:id', handle(async (request, response, userId) => {
    const body = skillsBody(request.body, ['status', 'notes', 'applied_on']);
    const { status, notes, applied_on: appliedOn } = body;
    if (!Object.keys(body).length || (status !== undefined && !statuses.includes(status))) {
      throw skillsError(400, 'Supply valid application tracking fields');
    }
    const { rows: [job] } = await database.query(
      `WITH previous AS (
         SELECT id, status FROM saved_jobs WHERE user_id = $1 AND id = $2 FOR UPDATE
       ), changed AS (
         UPDATE saved_jobs SET status = COALESCE($3, saved_jobs.status),
           notes = CASE WHEN $4 THEN $5 ELSE notes END,
           applied_on = CASE WHEN $6 THEN $7::date ELSE applied_on END,
           updated_at = clock_timestamp()
         WHERE user_id = $1 AND id IN (SELECT id FROM previous)
         RETURNING ${fields}
       ), event AS (
         INSERT INTO saved_job_events (job_id, status) SELECT changed.id, changed.status
         FROM changed JOIN previous USING (id) WHERE changed.status IS DISTINCT FROM previous.status
       )
       SELECT * FROM changed`,
      [userId, recordId(request.params.id), status ?? null, notes !== undefined, optionalText(notes, 'notes', 4000),
        appliedOn !== undefined, appliedDate(appliedOn)],
    );
    if (!job) throw skillsError(404, 'Saved job not found');
    response.json({ job });
  }));

  router.delete('/saved/:id', handle(async (request, response, userId) => {
    const { rowCount } = await database.query('DELETE FROM saved_jobs WHERE user_id = $1 AND id = $2',
      [userId, recordId(request.params.id)]);
    if (!rowCount) throw skillsError(404, 'Saved job not found');
    response.status(204).end();
  }));
  return router;
}
