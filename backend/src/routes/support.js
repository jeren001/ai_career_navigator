import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { inputText, pageOffset, recordId } from '../services/account-input.js';
import { optionalAuthentication, requireAuthentication } from '../services/auth.js';
import { catalogLanguage } from '../services/challenge-catalog.js';
import { skillsBody, skillsError } from '../services/user-skills.js';

const statuses = ['open', 'in_progress', 'resolved', 'closed'];
const ticketColumns = 'id, subject, message, language, status, created_at, updated_at';
const staffAccess = 'EXISTS (SELECT 1 FROM support_staff WHERE user_id = $1)';

export default function createSupportRouter(database) {
  const router = Router();
  router.use(optionalAuthentication(database), requireAuthentication);

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

  router.post('/tickets', handle(async (request, response, userId) => {
    const { subject, message, language } = skillsBody(request.body, ['subject', 'message', 'language']);
    if (language !== undefined) catalogLanguage(language);
    const { rows: [ticket] } = await database.query(
      `WITH ticket AS (
         INSERT INTO support_tickets (id, user_id, subject, message, language)
         SELECT $2, id, $3, $4, COALESCE($5, preferred_language) FROM users WHERE id = $1 AND NOT is_guest
         RETURNING ${ticketColumns}
       ), event AS (
         INSERT INTO support_ticket_events (ticket_id, actor, status) SELECT id, 'account', status FROM ticket
       )
       SELECT * FROM ticket`,
      [userId, randomUUID(), inputText(subject, 'subject', 160), inputText(message, 'message', 4000), language ?? null],
    );
    if (!ticket) throw skillsError(401, 'Authentication required');
    response.status(201).json({ ticket });
  }));

  function list(staff) {
    return handle(async (request, response, userId) => {
      const { status } = request.query;
      const offset = pageOffset(request.query.offset);
      if (status !== undefined && !statuses.includes(status)) throw skillsError(400, 'Invalid ticket status');
      if (staff && !(await database.query('SELECT 1 WHERE ' + staffAccess, [userId])).rowCount) {
        throw skillsError(403, 'Support staff access required');
      }
      const { rows } = await database.query(
        `SELECT ${ticketColumns} FROM support_tickets
         WHERE ${staff ? staffAccess : 'user_id = $1'} AND ($2::text IS NULL OR status = $2)
         ORDER BY updated_at DESC, id DESC LIMIT 21 OFFSET $3`, [userId, status ?? null, offset],
      );
      response.json({ tickets: rows.slice(0, 20), next_offset: rows.length > 20 ? offset + 20 : null });
    });
  }
  router.get('/tickets', list(false));
  router.get('/queue', list(true));

  router.get('/tickets/:id', handle(async (request, response, userId) => {
    const id = recordId(request.params.id);
    const { rows: [ticket] } = await database.query(
      `SELECT ${ticketColumns}, (
           SELECT COALESCE(jsonb_agg(to_jsonb(e) - 'ticket_id' - 'id' ORDER BY id), '[]')
           FROM support_ticket_events e WHERE e.ticket_id = t.id
         ) AS history
       FROM support_tickets t WHERE id = $2 AND (user_id = $1 OR ${staffAccess})`, [userId, id],
    );
    if (!ticket) throw skillsError(404, 'Support ticket not found');
    response.json({ ticket });
  }));

  router.patch('/tickets/:id/status', handle(async (request, response, userId) => {
    const id = recordId(request.params.id);
    const { status, message } = skillsBody(request.body, ['status', 'message']);
    if (!statuses.includes(status)) throw skillsError(400, 'Invalid ticket status');
    const note = message === undefined ? null : inputText(message, 'message', 2000);
    const { rows: [ticket] } = await database.query(
      `WITH previous AS (
         SELECT ${ticketColumns} FROM support_tickets WHERE id = $2 AND ${staffAccess} FOR UPDATE
       ), changed AS (
         UPDATE support_tickets SET status = $3, updated_at = clock_timestamp()
         WHERE id IN (SELECT id FROM previous WHERE status IS DISTINCT FROM $3 OR $4::text IS NOT NULL)
         RETURNING ${ticketColumns}
       ), event AS (
         INSERT INTO support_ticket_events (ticket_id, actor, status, message)
         SELECT id, 'staff', status, $4 FROM changed
       )
       SELECT * FROM changed
       UNION ALL SELECT * FROM previous WHERE NOT EXISTS (SELECT 1 FROM changed)`,
      [userId, id, status, note],
    );
    if (!ticket) {
      if (!(await database.query('SELECT 1 WHERE ' + staffAccess, [userId])).rowCount) {
        throw skillsError(403, 'Support staff access required');
      }
      throw skillsError(404, 'Support ticket not found');
    }
    response.json({ ticket });
  }));
  return router;
}
