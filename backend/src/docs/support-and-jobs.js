import { array, ref, string } from './schemas.js';

const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, required });
const dateTime = { ...string, format: 'date-time' };
const uuid = { ...string, format: 'uuid' };
const locale = { ...string, enum: ['en', 'zh-CN'] };
const nullable = (schema) => ({ ...schema, nullable: true });
const text = (maximum) => ({ ...string, minLength: 1, maxLength: maximum });
const supportStatus = { ...string, enum: ['open', 'in_progress', 'resolved', 'closed'] };
const jobStatus = { ...string, enum: ['saved', 'applied', 'interviewing', 'offer', 'rejected', 'withdrawn'] };
const jobKind = { ...string, enum: ['job', 'internship'] };
const url = { ...text(2048), format: 'uri', pattern: '^https://' };
const dates = { created_at: dateTime, updated_at: dateTime };
const query = (name, schema) => ({ name, in: 'query', schema });
const offset = { type: 'integer', minimum: 0, maximum: 2147483647 };
const id = { name: 'id', in: 'path', required: true, schema: uuid };
const listParams = (status) => [query('status', status), query('offset', offset)];
const list = (name, item) => object({ [name]: array(item), next_offset: nullable(offset) });
const json = (schema) => ({ 'application/json': { schema } });
const ticketInput = { subject: text(160), message: text(4000), language: locale };
const ticket = { id: uuid, ...ticketInput, status: supportStatus, ...dates };
const supportHistory = array(object({
  actor: { ...string, enum: ['account', 'staff'] }, status: supportStatus, message: nullable(string), created_at: dateTime,
}));
const jobInput = { url, title: text(200), employer: nullable(text(160)), location: nullable(text(160)), notes: nullable(text(4000)) };
const jobUpdate = { status: jobStatus, notes: jobInput.notes, applied_on: nullable({ ...string, format: 'date' }) };
const job = { id: uuid, ...jobInput, ...jobUpdate, ...dates };
const jobHistory = array(object({ status: jobStatus, created_at: dateTime }));
const vacancy = object({
  provider: string, external_id: string, url, title: string, employer: nullable(string),
  location: nullable(string), kind: jobKind,
});

function operation(tag, operationId, summary, schema, { code = 200, parameters, body, publicAccess = false, extra = {} } = {}) {
  const responses = {
    [code]: { description: summary + '.', ...(schema && { content: json(schema) }) },
  };
  for (const [status, description] of Object.entries({
    400: 'Invalid request.',
    ...(!publicAccess && { 401: 'A registered account is required.', 404: 'Record not found.' }),
    ...extra,
  })) responses[status] = { description, content: json(ref('Error')) };
  return {
    tags: [tag], operationId, summary, security: publicAccess ? [] : [{ bearerAuth: [] }],
    ...(parameters && { parameters }),
    ...(body && { requestBody: { required: true, content: json({ ...body, additionalProperties: false }) } }),
    responses,
  };
}

const support = (...args) => operation('Support', ...args);
const jobs = (...args) => operation('Jobs and Internships', ...args);
export const supportAndJobsPaths = {
  '/api/support/tickets': {
    get: support('listSupportTickets', 'List your support tickets', list('tickets', object(ticket)), { parameters: listParams(supportStatus) }),
    post: support('createSupportTicket', 'Create a support ticket', object({ ticket: object(ticket) }), {
      code: 201, body: object(ticketInput, ['subject', 'message']),
    }),
  },
  '/api/support/queue': {
    get: support('readSupportQueue', 'List tickets for authorized support staff', list('tickets', object(ticket)), {
      parameters: listParams(supportStatus), extra: { 403: 'Support staff access required.' },
    }),
  },
  '/api/support/tickets/{id}': {
    get: support('getSupportTicket', 'Read a ticket and its status history', object({ ticket: object({ ...ticket, history: supportHistory }) }), {
      parameters: [id],
    }),
  },
  '/api/support/tickets/{id}/status': {
    patch: support('updateSupportTicketStatus', 'Record a support status update', object({ ticket: object(ticket) }), {
      parameters: [id], body: object({ status: supportStatus, message: text(2000) }, ['status']),
      extra: { 403: 'Support staff access required.' },
    }),
  },
  '/api/jobs/search': {
    get: jobs('searchVacancies', 'Search vacancies from a configured provider', object({
      availability: { ...string, enum: ['available', 'not_configured'] },
      language: locale, vacancies: array(vacancy), next_cursor: nullable(string),
    }), {
      publicAccess: true, parameters: [
        query('q', text(120)), query('location', text(120)), query('kind', jobKind), query('language', locale), query('cursor', text(512)),
      ], extra: { 503: 'Configured provider unavailable.' },
    }),
  },
  '/api/jobs/saved': {
    get: jobs('listSavedJobs', 'List saved jobs and applications', list('jobs', object(job)), { parameters: listParams(jobStatus) }),
    post: jobs('saveJob', 'Save a job by URL', object({ job: object(job) }), {
      code: 201, body: object(jobInput, ['url', 'title']), extra: { 409: 'URL is already saved for this account.' },
    }),
  },
  '/api/jobs/saved/{id}': {
    get: jobs('getSavedJob', 'Read a saved job and its status history', object({ job: object({ ...job, history: jobHistory }) }), { parameters: [id] }),
    patch: jobs('updateSavedJob', 'Update application status, notes or date', object({ job: object(job) }), {
      parameters: [id], body: { ...object(jobUpdate, []), minProperties: 1 },
    }),
    delete: jobs('deleteSavedJob', 'Delete a saved job and its application history', null, { code: 204, parameters: [id] }),
  },
};
