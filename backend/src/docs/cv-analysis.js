import { careerLevels } from '../services/cv-analysis.js';
import { rubric, rubricVersion } from '../services/cv-analysis-rubric.js';
import { resumeMediaTypes } from '../services/resume-extraction.js';
import { array, ref, string } from './schemas.js';

const root = '/api/resumes/analyses';
const object = (properties, required = Object.keys(properties)) => ({ type: 'object', properties, ...(required.length && { required }) });
const choice = (...values) => ({ ...string, enum: values });
const nullable = (schema) => ({ ...schema, nullable: true });
const uuid = { ...string, format: 'uuid' };
const timestamp = { ...string, format: 'date-time' };
const integer = { type: 'integer', minimum: 0 };
const score = { type: 'number', minimum: 0, maximum: 100 };
const flag = { type: 'boolean', default: false };
const source = choice('rule_based', 'ai');
const resultStatus = choice('complete', 'partial', 'unavailable', 'not_applicable');
const text = { ...string, minLength: 1, maxLength: 120 };
const settings = {
  language: choice('en', 'zh-CN'), target_job_title: text, industry: text, specialization: text,
  career_level: choice(...careerLevels), target_country: { ...string, pattern: '^[A-Z]{2}$' },
};
const options = { ...settings, consent: flag, save: flag };
const body = (schema) => ({ required: true, content: { 'application/json': { schema } } });
const query = (name, schema) => ({ in: 'query', name, schema });
const idParameter = { in: 'path', name: 'reportId', required: true, schema: uuid };
const codes = object({ code: string, message: string });
const finding = object({
  criterion_id: string, source, points: score, max_points: score, evidence_ids: array(integer), explanation: string,
}, ['criterion_id', 'source', 'points', 'max_points', 'evidence_ids']);
const summary = {
  id: uuid, resume_id: nullable(uuid), created_at: timestamp, overall: ref('CvOverall'),
  settings: ref('CvAnalysisSettings'), rubric_version: string,
};
export const cvAnalysisSchemas = {
  CvAnalysisSettings: object(settings, ['language']),
  CvOverall: object({
    score: nullable({ ...integer, maximum: 100 }), weighted_score: nullable(score), status: resultStatus,
    classification: nullable(object({ id: string, label: string })), scored_category_weight: score,
  }),
  CvAnalysisReport: object({
    rubric_version: { ...string, example: rubricVersion },
    settings: ref('CvAnalysisSettings'), overall: ref('CvOverall'),
    categories: array(object({
      id: choice(...rubric.map(([id]) => id)), weight: score, score: nullable(score), status: resultStatus,
      scored_points_available: score, applicable_points: score,
      criteria: array(object({
        id: string, max_points: score, points: nullable(score), source,
        status: choice('scored', 'not_applicable', 'unavailable'),
        evidence_ids: array(integer), reason: string, explanation: string,
      }, ['id', 'max_points', 'points', 'source', 'status'])),
    })),
    evaluation_summary: string, source: object({ mode: choice('saved_resume', 'upload'), media_type: nullable(string) }),
    document_observations: nullable(object({ tables: integer, text_boxes: integer, graphics: integer, multi_column_sections: integer })),
    ai: object({ consent: { type: 'boolean' }, status: choice('ai', 'fallback', 'skipped'), provider: string, reason: string }, ['consent', 'status']),
    limitations: array(codes), strengths: array(finding), areas_for_improvement: array(finding),
    critical_issues: array(object({ ...codes.properties, source })),
    evidence: array(object({ id: integer, section: string, text: string })),
    sections: array(object({ id: string, status: choice('detected', 'not_detected'), evidence_ids: array(integer),
      findings: array(finding), recommendation_codes: array(string) })),
    recommendations: array(object({
      code: string, section: string, priority: choice('low', 'medium', 'high'), source,
      issue: string, explanation: string, improvement: string, evidence_id: integer,
      original_content: nullable(string), suggested_revision: nullable(string),
      revision_is_template: { type: 'boolean', description: 'The revision contains placeholders to fill with verified facts.' },
    }, ['code', 'section', 'priority', 'source', 'improvement', 'original_content', 'suggested_revision'])),
  }),
  CvSavedAnalysis: object({ id: uuid, resume_id: nullable(uuid), created_at: timestamp, report: ref('CvAnalysisReport') }),
  CvAnalysisPreview: object({
    id: nullable(uuid), resume_id: nullable(uuid), created_at: nullable(timestamp), report: ref('CvAnalysisReport'), save_token: string,
  }),
  CvAnalysisList: object({ reports: array(object(summary)), next_offset: nullable(integer) }),
};

const response = (description, schema) => ({ description, ...(schema && { content: { 'application/json': { schema } } }) });
function operation(operationId, summaryText, responses, fields = {}) {
  return {
    tags: ['Analyze CV'], operationId, summary: summaryText, security: [{ bearerAuth: [] }], ...fields,
    responses: {
      ...responses, 400: response('Invalid input or preview token.', ref('Error')),
      401: response('Registered account required.', ref('Error')), 404: response('Owned record not found.', ref('Error')),
      503: response('Required service or database schema unavailable.', ref('Error')),
    },
  };
}
const evaluationResponses = {
  200: response('Unsaved evaluation and save token.', ref('CvAnalysisPreview')),
  201: response('Saved evaluation.', ref('CvSavedAnalysis')),
};
export const cvAnalysisPaths = {
  [root]: {
    post: operation('analyzeSavedCv', 'Evaluate an owned résumé', evaluationResponses, {
      description: 'Set consent to true to allow an AI evaluation. Set save to true to persist the report immediately.',
      requestBody: body({ ...object({ resume_id: uuid, ...options }, ['resume_id']), additionalProperties: false }),
    }),
    get: operation('listCvAnalysisReports', 'List saved analyses', {
      200: response('Reports with pagination.', ref('CvAnalysisList')),
    }, { parameters: [query('offset', integer)] }),
  },
  [root + '/upload']: {
    post: operation('analyzeUploadedCv', 'Evaluate an uploaded PDF or DOCX', {
      ...evaluationResponses,
      413: response('File exceeds the 5 MiB limit.', ref('Error')),
      415: response('Unsupported media type or content encoding.', ref('Error')),
      422: response('Invalid document or text extraction failed.', ref('Error')),
    }, {
      parameters: Object.entries(options).map(([key, schema]) => query(key, schema)),
      requestBody: { required: true, content: Object.fromEntries(Object.keys(resumeMediaTypes)
        .map((type) => [type, { schema: { ...string, format: 'binary' } }])) },
    }),
  },
  [root + '/save']: {
    post: operation('saveCvAnalysisPreview', 'Save an analysis preview', {
      201: response('Saved evaluation.', ref('CvSavedAnalysis')),
    }, {
      description: 'Send resume_id, report and save_token unchanged from the preview. The token is bound to the account and expires in 30 minutes.',
      requestBody: body({ ...object({ resume_id: nullable(uuid), report: ref('CvAnalysisReport'), save_token: string }), additionalProperties: false }),
    }),
  },
  [root + '/{reportId}']: {
    get: operation('readCvAnalysisReport', 'Read a saved analysis', {
      200: response('Saved evaluation.', ref('CvSavedAnalysis')),
    }, { parameters: [idParameter] }),
    delete: operation('deleteCvAnalysisReport', 'Delete a saved analysis', {
      204: response('Deleted.'),
    }, { parameters: [idParameter] }),
  },
};
