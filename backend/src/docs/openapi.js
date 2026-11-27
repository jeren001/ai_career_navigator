import { QUESTIONS } from '../services/assessment.js';
import { assistantPaths, assistantSchemas } from './career-assistant.js';
import { array, ref, schemas, string } from './schemas.js';

const optionalBearer = [{}, { bearerAuth: [] }];
const requireBearer = [{ bearerAuth: [] }];
const response = (description, schema, examples) => ({
  description,
  content: { 'application/json': { schema, ...(examples && { examples }) } },
});
const errors = (descriptions) => Object.fromEntries(
  Object.entries({ 500: 'Internal server error.', ...descriptions })
    .map(([status, description]) => [status, response(description, ref('Error'))]),
);
const body = (name, examples, required = true) => ({
  required,
  content: { 'application/json': { schema: ref(name), examples } },
});
const example = (summary, value) => ({ summary, value });
const accountErrors = {
  400: 'Invalid input or expired, used, or incorrect code.',
  401: 'Authentication or the current password is invalid.',
  409: 'The requested email or account state conflicts with an existing record.',
  429: 'Too many requests. Retry after the rate limit resets.',
  503: 'The account email provider or authentication is unavailable.',
};
const accountOperation = (operationId, summary, schema, sample, { publicAccess = false, accepted = false } = {}) => ({
  tags: ['Authentication'], operationId, summary,
  security: publicAccess ? [] : requireBearer,
  ...(schema && { requestBody: body(schema, { account: example('Account request', sample) }) }),
  responses: {
    ...(accepted ? { 202: response('Request accepted.', ref('EmailCodeAccepted')) }
      : { 204: { description: 'Request completed.' } }),
    ...errors(accountErrors),
  },
});
const photoResponse = {
  description: 'Sanitized JPEG.',
  content: { 'image/jpeg': { schema: { type: 'string', format: 'binary' } } },
};

const demoId = '3c2243f4-289a-4fa2-8299-23dd7d06d076';
const demoCredentials = { email: 'career.demo@example.test', password: 'example-password-123' };
const skillId = { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, example: 1 };
const skillErrors = {
  401: 'A registered account bearer token is required.',
  503: 'The authentication configuration or skills migration is unavailable.',
};
const catalogQuery = (name, description, schema = string) => ({ name, in: 'query', description, schema });
const catalogLanguage = catalogQuery('language', 'Display language.', { type: 'string', enum: ['en', 'zh-CN'], default: 'en' });
const catalogField = catalogQuery('career_field', 'Exact career field label from the catalog.');
const catalogSkill = catalogQuery('skill', 'Skill name or dataset skill slug.');
const pathId = (schema, example) => ({ name: 'id', in: 'path', required: true, schema, example });
const challengeId = pathId(string, 'sc-ta-query-library');
const submissionId = pathId({ ...string, format: 'uuid' }, demoId);
const roadmapId = pathId({ ...string, format: 'uuid' }, demoId);
const resumeId = pathId({ ...string, format: 'uuid' }, demoId);
const resumeConsentExample = { resume_id: demoId, consent: true };
const resumeErrors = {
  400: 'Invalid request options, fields, ID, or missing consent where required.',
  401: 'A registered account bearer token is required.',
  404: 'Owned resume or file not found.',
  503: 'The resume schema, authentication, or document extractor is unavailable.',
};
const resumeFormats = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const resumeBinary = Object.fromEntries(resumeFormats.map((type) => [
  type, { schema: { type: 'string', format: 'binary' } },
]));
const milestoneId = { ...roadmapId, name: 'milestoneId', example: '88b04fb4-e25f-4a51-978d-2065df0d1e34' };
const roadmapErrors = {
  401: 'A registered account bearer token is required.',
  503: 'Authentication configuration or the roadmap database migration is unavailable.',
};
const interviewErrors = {
  400: 'Invalid interview fields, offset, or session ID.',
  401: 'A registered account bearer token is required.',
  404: 'Active profession or owned interview session not found.',
  409: 'The interview is processing another request, the question has changed, or feedback is premature.',
  503: 'Authentication configuration or interview schema unavailable.',
};
const challengeErrors = {
  400: 'Invalid submission ID or request body.',
  401: 'A registered account bearer token is required.',
  404: 'Challenge or owned submission not found.',
  503: 'Authentication configuration or practical challenges schema unavailable.',
};
const demoResult = {
  assessment_id: demoId, session_id: 12, user_id: 7, completed_at: '2026-11-25T08:30:00Z', language: 'en',
  trait_scores: { analytics: 100, creativity: 42, people: 38, structure: 65, autonomy: 59 },
  directions: [{
    name: 'Technology & AI', match_percent: 100, score_basis: 'relative_to_top_direction',
    reason: 'Your answers point to analytics and structure, which align with Technology & AI roles.',
  }],
  specializations: [{
    name: 'Product analytics', match_percent: 100, score_basis: 'relative_to_top_profession',
    reason: 'This specialization connects to Data Analyst.',
  }],
  professions: [{
    id: 16, slug: 'data-analyst', title: 'Data Analyst', cluster: 'Tech & Data',
    summary: 'Turns business questions into queries and clear reporting.',
    niche_pivot_friendly: true, match_percent: 100, score_basis: 'relative_to_top_profession',
    market_pulse: { career_field: 'Technology & AI' }, reason: 'This fits your signals around analytics and SQL.',
  }],
  custom_analysis: [],
};
const aiResult = {
  ...demoResult,
  professions: demoResult.professions.map((role) => ({
    ...role, ai_explanation: 'Your interest in finding patterns fits the task of comparing records for unusual changes.',
  })),
  personalization: {
    status: 'ai', provider: 'gemini', cached: false, overview: 'Explore data analysis with a small public transit project.',
    strengths: ['You selected “Finding patterns, testing ideas, and solving puzzles”'],
    skills_to_develop: ['SQL queries', 'Communicating findings'],
    roadmap: [
      { phase: 'Explore', action: 'Choose a public transit dataset.', outcome: 'A defined question to answer.' },
      { phase: 'Build', action: 'Query delay patterns by route.', outcome: 'A short chart and notes.' },
      { phase: 'Review', action: 'Ask a peer for feedback.', outcome: 'One improvement to test.' },
    ],
  },
};
const fallbackResult = {
  ...demoResult,
  personalization: {
    status: 'fallback', reason: 'service_unavailable',
    message: 'Recommendations use the deterministic assessment results.',
    strengths: [], skills_to_develop: [], roadmap: [],
  },
};
const assessmentPaths = {
  start: {
    summary: 'Start a hybrid assessment',
    description: 'Use an existing token or leave authorization empty to create a guest. The guest response includes an access_token. Paste it into Authorize before submitting answers. Language defaults to the registered profile preference or English for guests.',
    security: optionalBearer,
    requestBody: body('AssessmentStart', {
      defaults: example('Use the default language', {}),
      chinese: example('Start in Simplified Chinese', { language: 'zh-CN' }),
    }, false),
    responses: {
      201: response('Assessment created and first question returned.', ref('AssessmentStarted')),
      ...errors({ 400: 'Invalid request or language, or client-supplied user_id.', 401: 'Invalid bearer token.', 503: 'Auth configuration or assessment database schema is unavailable.' }),
    },
  },
  answer: {
    summary: 'Submit the current answer and advance',
    description: 'Use the same owner token and assessment_id throughout. Copy question.id and a question.options[].id from the previous response or provide custom_answer. After answer 14, the server builds the clarification batch. The final answer returns complete: true and the result. In-progress sessions are held by the running server.',
    security: requireBearer,
    requestBody: body('AssessmentAnswer', {
      option: example('First question with a predefined option', { assessment_id: demoId, question_id: 'q1', option_id: 'q1-analytical' }),
      custom: example('First question with custom text', { assessment_id: demoId, question_id: 'q1', custom_answer: 'I enjoy comparing public transit data and finding patterns in delays.' }),
    }),
    responses: {
      200: response('Next question or completed assessment.', {
        oneOf: [ref('AssessmentInProgress'), ref('AssessmentCompleted')],
      }, {
        next: example('Next bank question', {
          complete: false, assessment_id: demoId, progress: { answered: 1, target: 18 }, stage: 'general', language: 'en',
          question: {
            id: QUESTIONS[1].id, dimension: QUESTIONS[1].dimension, text: QUESTIONS[1].text,
            source: 'bank', allows_custom_answer: true,
            options: QUESTIONS[1].options.map(({ id, label }) => ({ id, label })),
          },
        }),
        clarification: example('First AI clarification question', {
          complete: false, assessment_id: demoId, progress: { answered: 14, target: 18 },
          stage: 'clarification', language: 'en',
          clarifications: { status: 'mixed', ai_questions: 3, provider: 'gemini' },
          question: {
            id: 'clarify-past_example', dimension: 'past_example', source: 'ai', allows_custom_answer: true,
            text: 'You mentioned “Finding patterns”. Where would you most like to apply this interest or skill?',
            options: [
              { id: 'clarify-past_example-0-1', label: 'A personal project' },
              { id: 'clarify-past_example-0-2', label: 'School or training' },
              { id: 'clarify-past_example-0-3', label: 'At work' },
              { id: 'clarify-past_example-0-4', label: 'In a community or volunteer setting' },
            ],
          },
        }),
        ai: example('Completed with AI guidance', {
          complete: true, result: { ...aiResult, clarifications: { status: 'ai', ai_questions: 4, provider: 'gemini' } },
        }),
        fallback: example('Completed with rule-based guidance', {
          complete: true, result: { ...fallbackResult, clarifications: { status: 'fallback', ai_questions: 0, reason: 'service_unavailable' } },
        }),
      }),
      ...errors({
        400: 'Invalid answer or question ID. Use the current question from the preceding response.',
        401: 'Invalid bearer token.',
        403: 'The assessment requires its owner bearer token.',
        404: 'Assessment missing or expired.',
        409: 'Another answer for this assessment is being processed.',
        503: 'No active careers or the assessment database schema is unavailable.',
      }),
    },
  },
  evaluate: {
    summary: 'Evaluate a batch of bank answers',
    description: 'Submit 15–18 distinct bank answers for a completed evaluation in one request. Use start and answer for the interactive hybrid stages. An unauthenticated evaluation creates a guest and returns an access_token.',
    security: optionalBearer,
    requestBody: body('AssessmentEvaluation', {
      bank: example('Ready-to-run bank answer batch', {
        language: 'en',
        answers: QUESTIONS.slice(0, 15).map(({ id, options }) => ({ question_id: id, option_id: options[0].id })),
      }),
    }),
    responses: {
      201: response('Assessment evaluated and saved.', ref('AssessmentEvaluated'), {
        ai: example('AI guidance', aiResult),
        fallback: example('Rule-based guidance', fallbackResult),
      }),
      ...errors({ 400: 'Invalid request or bank answers.', 401: 'Invalid bearer token.', 503: 'Auth, catalog, or assessment database schema is unavailable.' }),
    },
  },
};

export const openapi = {
  openapi: '3.0.3',
  info: {
    title: 'AI Career Navigator API',
    version: '1.0.0',
    description: [
      '### Complete a guest assessment in Swagger UI',
      '1. Leave **Authorize** empty. Open **POST /api/assessment/start**, click **Try it out**, then **Execute**.',
      '2. Copy the returned `access_token` into **Authorize** as the token value. Swagger adds the Bearer prefix. Keep the returned `assessment_id`.',
      '3. Open **POST /api/assessment/answer** and click **Try it out**. Replace the example ID with your assessment ID. Set `question_id` from the last response and use an option ID or custom text. Click **Execute** for each of the 18 questions.',
      '4. Follow the next `question` returned after each answer. The stages are six general, eight adaptive questions selected from the 105-question bilingual bank, and four clarification questions. The clarification batch begins after answer 14.',
      '5. On `complete: true`, inspect `result.clarifications`, `result.custom_analysis`, and `result.personalization`. If guidance uses fallback, its `reason` explains why. Career scores are computed by the rules in either case.',
      '',
      'Registered users can log in, authorize with the returned token, and follow the same assessment steps. You can also create a guest explicitly with **POST /api/auth/guest**.',
    ].join('\n\n'),
  },
  servers: [{ url: '/', description: 'Current backend' }],
  tags: [
    { name: 'Health' }, { name: 'Authentication' }, { name: 'Profile' }, { name: 'Settings' },
    { name: 'Careers' }, { name: 'Career Match' }, { name: 'Career Assistant' }, { name: 'My Roadmap' }, { name: 'My Skills' }, { name: 'Practical Challenges' }, { name: 'Learning Hub' },
    { name: 'Interview Simulator' }, { name: 'My Resume' }, { name: 'Assessment' }, { name: 'Quiz aliases' },
  ],
  paths: {
    ...assistantPaths,
    '/api/health': { get: {
      tags: ['Health'], operationId: 'getHealth', summary: 'Check API health',
      responses: { 200: response('API is reachable.', ref('Health')) },
    } },
    '/api/auth/guest': { post: {
      tags: ['Authentication'], operationId: 'createGuest', summary: 'Create a guest session',
      description: 'Leave authorization empty when creating a new guest. Use the returned token for assessment and identity requests.',
      security: optionalBearer,
      responses: {
        201: response('Guest created.', ref('AuthResponse')),
        ...errors({ 401: 'Invalid bearer token.', 409: 'An identity is already active.', 503: 'Authentication signing is unavailable.' }),
      },
    } },
    '/api/auth/register': { post: {
      tags: ['Authentication'], operationId: 'register', summary: 'Register or promote a guest',
      description: 'Authorize with your guest token to retain that guest’s assessments when registering. Replace the guest token with the account token from the response.',
      security: optionalBearer,
      requestBody: body('Registration', { account: example('Register with email', { ...demoCredentials, display_name: 'Career Demo', username: 'career.demo', preferred_language: 'en' }) }),
      responses: {
        201: response('Account registered.', ref('AuthResponse')),
        ...errors({ 400: 'Invalid registration details.', 401: 'Invalid bearer token.', 409: 'Email or username conflict, or guest no longer available.', 429: 'Registration rate limit reached.', 503: 'Authentication signing is unavailable.' }),
      },
    } },
    '/api/auth/email-verification/request': { post: accountOperation('requestEmailVerification',
      'Send a verification code to your current email', null, null, { accepted: true }) },
    '/api/auth/email-verification/confirm': { post: accountOperation('verifyEmail',
      'Verify your current email with an eight-digit code', 'EmailCode', { code: '01234567' }) },
    '/api/auth/email-change/request': { post: accountOperation('requestEmailChange',
      'Check your current password and send a code to the new email', 'EmailChangeRequest',
      { email: 'new@example.test', current_password: 'example-password-123' }, { accepted: true }) },
    '/api/auth/email-change/confirm': { post: accountOperation('confirmEmailChange',
      'Confirm the new email and invalidate existing sessions', 'EmailCode', { code: '01234567' }) },
    '/api/auth/password-reset/request': { post: accountOperation('requestPasswordReset',
      'Request an account recovery code', 'PasswordResetRequest', { email: 'career.demo@example.test', language: 'zh-CN' },
      { accepted: true, publicAccess: true }) },
    '/api/auth/password-reset/confirm': { post: accountOperation('confirmPasswordReset',
      'Reset a password and invalidate existing sessions', 'PasswordResetConfirm',
      { email: 'career.demo@example.test', code: '01234567', new_password: 'another-example-password' }, { publicAccess: true }) },
    '/api/auth/password/change': { post: accountOperation('changePassword',
      'Change your password and invalidate existing sessions', 'PasswordChange',
      { current_password: 'example-password-123', new_password: 'another-example-password' }) },
    '/api/auth/account': { delete: accountOperation('deleteAccount',
      'Delete your account and linked data', 'AccountDelete',
      { current_password: 'example-password-123', confirmation: 'DELETE' }) },
    '/api/settings': {
      get: {
        tags: ['Settings'], operationId: 'getSettings', summary: 'Read account preferences', security: requireBearer,
        responses: { 200: response('Language, privacy and notification preferences.', ref('SettingsResponse')), ...errors({ 401: 'Account token required.' }) },
      },
      patch: {
        tags: ['Settings'], operationId: 'updateSettings', summary: 'Update account preferences', security: requireBearer,
        requestBody: body('SettingsPatch', { preferences: example('Select a language and update visibility and notifications', {
          preferred_language: 'zh-CN', privacy_settings: { about_me: 'public' }, notification_settings: { roadmap_updates: true },
        }) }),
        responses: { 200: response('Saved preferences.', ref('SettingsResponse')), ...errors({ 400: 'Invalid preference fields.', 401: 'Account token required.' }) },
      },
    },
    '/api/notifications': { get: {
      tags: ['Settings'], operationId: 'listNotifications', summary: 'List your in-app notifications', security: requireBearer,
      parameters: [catalogQuery('before', 'Pass the previous response’s next_before value.', { type: 'integer', minimum: 1 })],
      responses: { 200: response('Notifications in the account language.', ref('NotificationList')), ...errors({ 400: 'Invalid cursor.', 401: 'Account token required.' }) },
    } },
    '/api/notifications/{id}/read': { patch: {
      tags: ['Settings'], operationId: 'readNotification', summary: 'Mark a notification as read', security: requireBearer,
      parameters: [skillId],
      responses: { 204: { description: 'Marked read.' }, ...errors({ 400: 'Invalid notification ID.', 401: 'Account token required.', 404: 'Owned notification not found.' }) },
    } },
    '/api/profile/photo': {
      get: {
        tags: ['Profile'], operationId: 'getProfilePhoto', summary: 'Get your profile photo', security: requireBearer,
        responses: { 200: photoResponse, ...errors({ 401: 'Account token required.', 404: 'Photo not found.' }) },
      },
      put: {
        tags: ['Profile'], operationId: 'putProfilePhoto', summary: 'Upload or replace your profile photo', security: requireBearer,
        description: 'Send raw image bytes, up to 5 MiB. The server stores a resized JPEG with metadata removed.',
        requestBody: { required: true, content: Object.fromEntries(['image/jpeg', 'image/png', 'image/webp'].map((type) =>
          [type, { schema: { type: 'string', format: 'binary' } }])) },
        responses: { 200: response('Photo saved.', ref('ProfilePhoto')), ...errors({
          400: 'Empty image.', 401: 'Account token required.', 413: 'Image exceeds 5 MiB.',
          415: 'Unsupported media type or content encoding.', 422: 'Invalid image or image exceeds processing limits.', 503: 'Photo processing unavailable.',
        }) },
      },
      delete: {
        tags: ['Profile'], operationId: 'deleteProfilePhoto', summary: 'Delete your profile photo', security: requireBearer,
        responses: { 204: { description: 'Photo removed.' }, ...errors({ 401: 'Account token required.' }) },
      },
    },
    '/api/profile/public/{username}': { get: {
      tags: ['Profile'], operationId: 'getPublicProfile', summary: 'Read fields published by the username owner', security: [],
      parameters: [{ ...pathId(string, 'career.demo'), name: 'username' }],
      responses: { 200: response('Published profile fields.', ref('PublicProfile')), ...errors({ 400: 'Invalid username.', 404: 'Public profile not found.' }) },
    } },
    '/api/profile/public/{username}/photo': { get: {
      tags: ['Profile'], operationId: 'getPublicProfilePhoto', summary: 'Read a published profile photo', security: [],
      parameters: [{ ...pathId(string, 'career.demo'), name: 'username' }],
      responses: { 200: photoResponse, ...errors({ 400: 'Invalid username.', 404: 'Public photo not found.' }) },
    } },
    '/api/auth/login': { post: {
      tags: ['Authentication'], operationId: 'login', summary: 'Sign in to a registered account',
      description: 'Use an account you registered. Paste the returned access_token into Authorize.',
      security: optionalBearer,
      requestBody: body('Credentials', { account: example('Sign in with email', demoCredentials) }),
      responses: {
        200: response('Signed in.', ref('AuthResponse')),
        ...errors({ 400: 'Invalid email or password format.', 401: 'Invalid credentials or bearer token.', 429: 'Login rate limit reached.', 503: 'Authentication signing is unavailable.' }),
      },
    } },
    '/api/auth/transfer': { post: {
      tags: ['Authentication'], operationId: 'transferGuestAssessments', summary: 'Transfer completed guest assessments',
      description: 'Authorize as the destination account and supply the source guest token in the body.',
      security: requireBearer,
      requestBody: body('GuestTransfer', { transfer: example('Transfer from a guest', { guest_access_token: '<guest access_token>' }) }),
      responses: {
        200: response('Number of assessments moved.', ref('GuestTransferResult')),
        ...errors({ 400: 'A guest token is required for the source.', 401: 'Account authentication or source token is invalid.', 404: 'Source guest is no longer available.', 503: 'Authentication signing is unavailable.' }),
      },
    } },
    '/api/auth/me': { get: {
      tags: ['Authentication'], operationId: 'getIdentity', summary: 'Get the current guest or account identity',
      security: requireBearer,
      responses: {
        200: response('Current identity.', ref('IdentityResponse')),
        ...errors({ 401: 'Guest or account bearer token required.', 404: 'User not found.', 503: 'Authentication signing is unavailable.' }),
      },
    } },
    '/api/profile': {
      get: {
        tags: ['Profile'], operationId: 'getProfile', summary: 'Read the registered user’s profile',
        security: requireBearer,
        responses: {
          200: response('Current profile.', ref('ProfileResponse')),
          ...errors({ 401: 'Registered account bearer token required.', 404: 'User not found.', 503: 'Authentication signing is unavailable.' }),
        },
      },
      patch: {
        tags: ['Profile'], operationId: 'updateProfile', summary: 'Update selected profile fields',
        description: 'A registered account is required. Pass null or an empty string to clear nullable text fields and an empty array to clear interests or skills.',
        security: requireBearer,
        requestBody: body('ProfilePatch', { profile: example('Update personal details and interests', {
          username: 'career.demo', first_name: '小明', last_name: '王', city: '上海',
          preferred_language: 'zh-CN', interests: ['数据可视化'], career_goals: '完成一个作品集项目。',
        }) }),
        responses: {
          200: response('Updated profile.', ref('ProfileResponse')),
          ...errors({ 400: 'Missing or invalid profile fields.', 401: 'Registered account bearer token required.', 404: 'User not found.', 409: 'Username is already taken.', 503: 'Authentication signing is unavailable.' }),
        },
      },
    },
    '/api/careers': { get: {
      tags: ['Careers'], operationId: 'listCareers', summary: 'List active careers',
      description: 'Results are ordered by ID. Supply at most one of category and cluster. Filters match exact catalog values.',
      parameters: [
        { name: 'category', in: 'query', description: 'Career field from market_pulse.career_field.', schema: { ...string, minLength: 1 }, example: 'Technology & AI' },
        { name: 'cluster', in: 'query', description: 'Career cluster.', schema: { ...string, minLength: 1 } },
        { name: 'niche_pivot_friendly', in: 'query', description: 'Filter by pivot suitability.', schema: { type: 'boolean' }, example: true },
      ],
      responses: {
        200: response('Active careers matching the filters.', array(ref('Career'))),
        ...errors({ 400: 'Invalid or conflicting filters.' }),
      },
    } },
    '/api/careers/{id}': { get: {
      tags: ['Careers'], operationId: 'getCareer', summary: 'Get an active career by ID',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 }, example: 1 }],
      responses: {
        200: response('Active career.', ref('Career')),
        ...errors({ 400: 'ID must be a positive integer.', 404: 'Active career not found.' }),
      },
    } },
    '/api/career-match': { get: {
      tags: ['Career Match'], operationId: 'getCareerMatch', summary: 'Read your latest saved career recommendations',
      description: 'Use the owner account or guest token. This reads the latest completed assessment and combines its saved recommendations with current skill gaps and practical challenge activity. It requires no AI request.',
      security: requireBearer,
      responses: {
        200: response('Saved recommendations with current skills and challenge activity.', ref('CareerMatch')),
        ...errors({ 401: 'A valid account or guest bearer token is required.', 404: 'No completed assessment for this identity.', 503: 'Authentication or the Career Match database migration is unavailable.' }),
      },
    } },
    '/api/career-match/refresh': { post: {
      tags: ['Career Match'], operationId: 'refreshCareerMatch', summary: 'Refresh and save career recommendations',
      description: 'Uses the existing assessment ranker with the latest completed answers and active catalog. Gemini guidance uses the current profile, structured skills, skill gaps, and challenge activity. Language defaults to the profile preference. If AI is unavailable, the response saves the deterministic recommendations and identifies the fallback reason.',
      security: requireBearer,
      requestBody: body('CareerMatchRefresh', {
        defaults: example('Use the profile language', {}),
        simplifiedChinese: example('Refresh in Simplified Chinese', { language: 'zh-CN' }),
        resume: example('Add resume guidance for this request', { resume_context: resumeConsentExample }),
      }, false),
      responses: {
        200: response('Refreshed recommendations with AI guidance or a fallback reason.', ref('CareerMatch')),
        ...errors({
          400: 'Invalid language or request fields.', 401: 'A registered account bearer token is required.',
          404: 'No completed assessment or owned resume for this account.', 409: 'The saved assessment or match changed during refresh.',
          503: 'Authentication, the Career Match database migration, or the active catalog is unavailable.',
        }),
      },
    } },
    '/api/resumes': {
      get: {
        tags: ['My Resume'], operationId: 'listResumes', summary: 'List your private resumes',
        security: requireBearer,
        parameters: [catalogQuery('offset', 'Number of resumes to skip.', {
          type: 'integer', minimum: 0, maximum: 2147483647, default: 0,
        })],
        responses: { 200: response('Resume metadata, newest first.', ref('ResumeList')), ...errors(resumeErrors) },
      },
      post: {
        tags: ['My Resume'], operationId: 'createResume', summary: 'Create a structured resume',
        security: requireBearer,
        requestBody: body('ResumeCreate', {
          analyst: example('Create a resume for an analyst role', {
            title: 'Analyst resume', language: 'en',
            sections: { skills: [{ name: 'SQL' }], projects: [{ name: 'Transit dashboard', details: 'Summarized on-time arrivals by route.' }] },
          }),
        }),
        responses: { 201: response('Saved resume.', ref('ResumeResponse')), ...errors(resumeErrors) },
      },
    },
    '/api/resumes/upload': { post: {
      tags: ['My Resume'], operationId: 'uploadResume', summary: 'Upload and extract a PDF or DOCX',
      description: 'Send the file as the raw binary request body with its document Content-Type. Maximum size is 5 MiB. Extraction reads up to 30 PDF pages or the DOCX main document. Save or replace structured section entries with PATCH.',
      security: requireBearer,
      parameters: [
        catalogQuery('title', 'Optional title.', { ...string, maxLength: 120 }),
        catalogQuery('language', 'Resume language. Defaults to the account preference.', { ...string, enum: ['en', 'zh-CN'] }),
      ],
      requestBody: { required: true, content: resumeBinary },
      responses: {
        201: response('Saved resume with text extracted locally.', ref('ResumeResponse')),
        ...errors({ ...resumeErrors, 413: 'File exceeds 5 MiB.', 415: 'Unsupported media type or content encoding.',
          422: 'Invalid, protected, or textless document, or an extraction limit was reached.' }),
      },
    } },
    '/api/resumes/{id}': {
      get: {
        tags: ['My Resume'], operationId: 'readResume', summary: 'Read an owned resume',
        security: requireBearer, parameters: [resumeId],
        responses: { 200: response('Resume sections and extracted text.', ref('ResumeResponse')), ...errors(resumeErrors) },
      },
      patch: {
        tags: ['My Resume'], operationId: 'updateResume', summary: 'Edit an owned resume',
        description: 'Each supplied section replaces that section. Supply an empty array to clear it.',
        security: requireBearer, parameters: [resumeId],
        requestBody: body('ResumeUpdate', { edit: example('Replace selected sections', {
          sections: { skills: [{ name: 'SQL' }, { name: 'Data visualization' }], certifications: [] },
        }) }),
        responses: { 200: response('Updated resume.', ref('ResumeResponse')), ...errors(resumeErrors) },
      },
      delete: {
        tags: ['My Resume'], operationId: 'deleteResume', summary: 'Delete an owned resume',
        security: requireBearer, parameters: [resumeId],
        responses: { 204: { description: 'Resume, uploaded bytes, and extracted text deleted.' }, ...errors(resumeErrors) },
      },
    },
    '/api/resumes/{id}/file': { get: {
      tags: ['My Resume'], operationId: 'downloadResume', summary: 'Download the original file as an attachment',
      security: requireBearer, parameters: [resumeId],
      responses: { 200: { description: 'Private original document.', content: resumeBinary }, ...errors(resumeErrors) },
    } },
    '/api/resumes/{id}/analyze': { post: {
      tags: ['My Resume'], operationId: 'analyzeResume', summary: 'Analyze a resume with consent',
      description: 'Explicit consent allows the configured AI provider to process selected resume excerpts for this request. Suggestions link to source excerpts as resume claims and use rule-based advice if the provider is unavailable.',
      security: requireBearer, parameters: [resumeId],
      requestBody: body('ResumeAnalyze', { analyst: example('Analyze for a target role', { consent: true, target_role: 'Data analyst' }) }),
      responses: { 200: response('Request-scoped resume guidance.', ref('ResumeAnalysisResponse')), ...errors(resumeErrors) },
    } },
    '/api/roadmaps': {
      post: {
        tags: ['My Roadmap'], operationId: 'createRoadmap', summary: 'Generate and save a learning roadmap',
        security: requireBearer,
        description: 'Defaults to the top profession in your latest Career Match and your profile language. Uses current skills and practice history. A new roadmap preserves earlier plans and progress. The saved response shows whether guidance used AI or fallback.',
        requestBody: body('RoadmapCreate', {
          defaults: example('Use the top career and default study time', {}),
          chinese: example('Plan for three hours a week in Simplified Chinese', { language: 'zh-CN', weekly_study_minutes: 180 }),
          resume: example('Add resume guidance for this request', { resume_context: resumeConsentExample }),
        }, false),
        responses: {
          201: response('Saved roadmap with three milestones.', ref('RoadmapResponse')),
          ...errors({ ...roadmapErrors, 400: 'Invalid roadmap options.', 404: 'No completed assessment, matched profession, or owned resume.' }),
        },
      },
      get: {
        tags: ['My Roadmap'], operationId: 'listRoadmaps', summary: 'List your saved roadmaps',
        security: requireBearer,
        parameters: [catalogQuery('offset', 'Number of roadmaps to skip. Use next_offset to fetch another page.', {
          type: 'integer', minimum: 0, maximum: 2147483647, default: 0,
        })],
        responses: {
          200: response('Up to 20 roadmaps, newest first.', ref('RoadmapList')),
          ...errors({ ...roadmapErrors, 400: 'Invalid offset.' }),
        },
      },
    },
    '/api/roadmaps/{id}': { get: {
      tags: ['My Roadmap'], operationId: 'readRoadmap', summary: 'Read your saved roadmap and progress',
      security: requireBearer,
      parameters: [roadmapId],
      responses: {
        200: response('Saved roadmap.', ref('RoadmapResponse')),
        ...errors({ ...roadmapErrors, 400: 'Invalid roadmap ID.', 404: 'Owned roadmap not found.' }),
      },
    } },
    '/api/roadmaps/{id}/milestones/{milestoneId}': { patch: {
      tags: ['My Roadmap'], operationId: 'updateRoadmapMilestone', summary: 'Edit, complete, or reopen a milestone',
      security: requireBearer,
      parameters: [roadmapId, milestoneId],
      requestBody: body('RoadmapMilestonePatch', {
        edit: example('Update the study estimate and notes', { estimated_minutes: 45, notes: 'Use the public transit sample.' }),
        complete: example('Mark complete', { completed: true }),
        reopen: example('Reopen and clear notes', { completed: false, notes: null }),
      }),
      responses: {
        200: response('Saved roadmap with updated milestone and progress.', ref('RoadmapResponse')),
        ...errors({ ...roadmapErrors, 400: 'Invalid IDs or milestone fields.', 404: 'Owned roadmap milestone not found.' }),
      },
    } },
    '/api/skills': {
      get: {
        tags: ['My Skills'], operationId: 'listUserSkills', summary: 'List your skills and assessment evidence',
        security: requireBearer,
        responses: { 200: response('Your current skills.', ref('SkillList')), ...errors(skillErrors) },
      },
      post: {
        tags: ['My Skills'], operationId: 'createUserSkill', summary: 'Add a skill with an optional self-rating',
        security: requireBearer,
        requestBody: body('SkillCreate', { sql: example('Add SQL', { name: 'SQL', self_assessed_level: 2, notes: 'Learning joins.' }) }),
        responses: {
          201: response('Skill created.', ref('SkillResponse')),
          ...errors({ ...skillErrors, 400: 'Invalid skill fields.', 409: 'You already have that skill.' }),
        },
      },
    },
    '/api/skills/{id}': {
      parameters: [skillId],
      patch: {
        tags: ['My Skills'], operationId: 'updateUserSkill', summary: 'Edit or self-assess a skill',
        description: 'Set self_assessed_level to null to clear it. Practical evidence is read-only. A rename to a different unassessed skill clears the earlier self-rating unless a new level is supplied.',
        security: requireBearer,
        requestBody: body('SkillUpdate', { assess: example('Update your rating', { self_assessed_level: 3 }) }),
        responses: {
          200: response('Skill updated.', ref('SkillResponse')),
          ...errors({ ...skillErrors, 400: 'Invalid ID or skill fields.', 404: 'Skill unavailable to the signed-in user.', 409: 'Duplicate skill or rename conflicts with practical evidence.' }),
        },
      },
      delete: {
        tags: ['My Skills'], operationId: 'deleteUserSkill', summary: 'Remove a skill from your inventory',
        security: requireBearer,
        responses: {
          204: { description: 'Skill removed.' },
          ...errors({ ...skillErrors, 400: 'Invalid skill ID.', 404: 'Skill unavailable to the signed-in user.' }),
        },
      },
    },
    '/api/skills/compare': { post: {
      tags: ['My Skills'], operationId: 'compareUserSkills', summary: 'Compare your skills with selected careers',
      description: 'Choose 1–5 active career IDs from /api/careers. The response prioritizes catalog skill gaps using a default planning level of 3 and prefers practical ratings when both evidence types exist. Guidance covers up to five gaps and uses the profile language by default. Use include_ai: false for deterministic suggestions without provider calls. To get additional resume guidance, supply resume_context with consent and leave include_ai enabled.',
      security: requireBearer,
      requestBody: body('SkillCompare', {
        comparison: example('Compare a career with AI guidance', { career_ids: [1], language: 'en' }),
        chinese: example('Compare with rule-based guidance in Simplified Chinese', { career_ids: [1], language: 'zh-CN', include_ai: false }),
        resume: example('Add resume guidance to the comparison', { career_ids: [1], resume_context: resumeConsentExample }),
      }),
      responses: {
        200: response('Prioritized comparisons and guidance. Inspect guidance.status, provider, and reason.', ref('SkillComparison')),
        ...errors({ ...skillErrors, 400: 'Invalid comparison options.', 404: 'At least one selected active career or the owned resume was not found.' }),
      },
    } },
    '/api/challenges': { get: {
      tags: ['Practical Challenges'], operationId: 'discoverChallenges', summary: 'Find practical challenges',
      parameters: [
        catalogLanguage, catalogField, catalogSkill,
        catalogQuery('profession_slug', 'Career slug from /api/careers.'),
        catalogQuery('difficulty', 'Estimated difficulty.', { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] }),
      ],
      responses: {
        200: response('Matching localized challenges.', ref('ChallengeList')),
        ...errors({ 400: 'Invalid catalog filters.' }),
      },
    } },
    '/api/challenges/{id}': { get: {
      tags: ['Practical Challenges'], operationId: 'getChallenge', summary: 'Read a challenge and its rubric',
      parameters: [challengeId, catalogLanguage],
      responses: {
        200: response('Localized challenge and practice guidance.', ref('ChallengeDetail')),
        ...errors({ 400: 'Invalid language.', 404: 'Challenge not found.' }),
      },
    } },
    '/api/challenges/{id}/submissions': { post: {
      tags: ['Practical Challenges'], operationId: 'submitChallenge', summary: 'Save an attempt',
      description: 'Submit a plain-text artifact. Code is stored as text. Use the evaluation endpoint to request rubric feedback.',
      parameters: [challengeId],
      security: requireBearer,
      requestBody: body('ChallengeSubmit', {
        sql: example('Submit a practice artifact', { artifact: 'East 2\nWest 1\nNorth 0', language: 'en' }),
      }),
      responses: {
        201: response('Attempt saved.', ref('ChallengeSubmissionResponse')), ...errors(challengeErrors),
      },
    } },
    '/api/challenges/submissions/{id}': { get: {
      tags: ['Practical Challenges'], operationId: 'getChallengeSubmission', summary: 'Read your attempt and feedback',
      parameters: [submissionId],
      security: requireBearer,
      responses: {
        200: response('Owned attempt.', ref('ChallengeSubmissionResponse')), ...errors(challengeErrors),
      },
    } },
    '/api/challenges/submissions/{id}/evaluate': { post: {
      tags: ['Practical Challenges'], operationId: 'evaluateChallengeSubmission', summary: 'Request AI rubric feedback',
      description: 'Evaluates the saved artifact against its rubric snapshot. Scores describe this submission only. Retry attempts with status unavailable when AI is accessible. While an evaluation is in progress, poll the submission endpoint.',
      parameters: [submissionId],
      security: requireBearer,
      responses: {
        200: response('Evaluated attempt or saved unavailable status with a reason.', ref('ChallengeSubmissionResponse')),
        202: response('An evaluation is already running.', ref('ChallengeSubmissionResponse')),
        ...errors(challengeErrors),
      },
    } },
    '/api/challenges/progress': { get: {
      tags: ['Practical Challenges'], operationId: 'getChallengeProgress', summary: 'Read your progress by challenge',
      security: requireBearer,
      responses: {
        200: response('Attempt and evaluation counts with the latest attempt ID.', ref('ChallengeProgress')),
        ...errors({ 401: challengeErrors[401], 503: challengeErrors[503] }),
      },
    } },
    '/api/learning/resources': { get: {
      tags: ['Learning Hub'], operationId: 'discoverLearningResources', summary: 'Find learning resources',
      parameters: [catalogLanguage, catalogField, catalogSkill],
      responses: {
        200: response('Matching resources with localized descriptions and provider metadata.', ref('LearningResourceList')),
        ...errors({ 400: 'Invalid catalog filters.' }),
      },
    } },
    '/api/interviews': {
      post: {
        tags: ['Interview Simulator'], operationId: 'createInterview', summary: 'Start a practice interview',
        description: 'Choose an active profession slug from GET /api/careers. Each session has three bank questions and three follow-ups. The selected difficulty applies to all bank questions.',
        security: requireBearer,
        requestBody: body('InterviewCreate', {
          english: example('Start a beginner interview', { profession_slug: 'backend-engineer', difficulty: 'beginner', language: 'en' }),
          chinese: example('Start in Simplified Chinese', { profession_slug: 'data-analyst', difficulty: 'intermediate', language: 'zh-CN' }),
        }),
        responses: {
          201: response('Session created with the first question.', ref('InterviewSessionResponse')),
          ...errors({ ...interviewErrors, 409: 'No question set for the selected profession and difficulty.' }),
        },
      },
      get: {
        tags: ['Interview Simulator'], operationId: 'listInterviews', summary: 'List your interview history and progress',
        security: requireBearer,
        parameters: [catalogQuery('offset', 'Use next_offset to fetch the next page.', { type: 'integer', minimum: 0, maximum: 2147483647, default: 0 })],
        responses: {
          200: response('Up to twenty sessions, newest first.', ref('InterviewHistory')),
          ...errors({ 400: interviewErrors[400], 401: interviewErrors[401], 503: interviewErrors[503] }),
        },
      },
    },
    '/api/interviews/{id}': { get: {
      tags: ['Interview Simulator'], operationId: 'getInterview', summary: 'Read or resume your practice interview',
      parameters: [submissionId],
      security: requireBearer,
      responses: {
        200: response('Owned session with transcript and saved feedback.', ref('InterviewSessionResponse')),
        ...errors({ 400: interviewErrors[400], 401: interviewErrors[401], 404: interviewErrors[404], 503: interviewErrors[503] }),
      },
    } },
    '/api/interviews/{id}/answers': { post: {
      tags: ['Interview Simulator'], operationId: 'answerInterview', summary: 'Answer the current interview question',
      description: 'Copy current_question.id from the previous response and repeat until status is completed. A main answer prompts a relevant follow-up. If AI is unavailable, the bank supplies that follow-up.',
      parameters: [submissionId],
      security: requireBearer,
      requestBody: body('InterviewAnswer', {
        english: example('Answer a first question', { question_id: 'iq-ta-review-feedback', answer: 'A reviewer pointed out that our retry could create duplicates. I added an idempotency key and verified that two requests produced one record.' }),
      }),
      responses: {
        200: response('Saved transcript and the next question, if any.', ref('InterviewSessionResponse')),
        ...errors(interviewErrors),
      },
    } },
    '/api/interviews/{id}/evaluate': { post: {
      tags: ['Interview Simulator'], operationId: 'evaluateInterview', summary: 'Request rubric feedback for a completed interview',
      description: 'After all six answers, request an evaluation with rubric points, strengths, mistakes, and improvement suggestions. If evaluation_status is unavailable, the transcript is saved and evaluation can be retried later.',
      parameters: [submissionId],
      security: requireBearer,
      requestBody: body('InterviewEvaluate', {
        resume: example('Add resume-based interview preparation tips', { resume_context: resumeConsentExample }),
      }, false),
      responses: {
        200: response('Saved evaluation or an unavailable status with a reason.', ref('InterviewSessionResponse')),
        202: response('An evaluation is running. Read the session to check progress.', ref('InterviewSessionResponse')),
        ...errors(interviewErrors),
      },
    } },
    ...Object.fromEntries(Object.entries(assessmentPaths).flatMap(([action, operation]) => [
      [`/api/assessment/${action}`, { post: { ...operation, tags: ['Assessment'], operationId: `assessment_${action}` } }],
      [`/api/quiz/${action}`, { post: { ...operation, tags: ['Quiz aliases'], operationId: `quiz_${action}`, summary: `Alias for /api/assessment/${action}` } }],
    ])),
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http', scheme: 'bearer',
        description: 'Paste the access_token returned by guest creation, assessment start, registration, or login.',
      },
    },
    schemas: { ...schemas, ...assistantSchemas },
  },
};
