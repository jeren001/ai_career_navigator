export const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
export const object = (properties, required = Object.keys(properties)) => ({
  type: 'object', properties, ...(required.length && { required }),
});
export const array = (items, limits = {}) => ({ type: 'array', items, ...limits });
export const string = { type: 'string' };
const integer = { type: 'integer' };
const bool = { type: 'boolean' };
const nullableText = { ...string, nullable: true };
const dateTime = { ...string, format: 'date-time' };
const uuid = { ...string, format: 'uuid' };
const choices = (...values) => ({ ...string, enum: values });
const untrimmed = { ...string, minLength: 1, pattern: '\\S' };
const id = { ...integer, minimum: 1 };
const strings = array(string);
const bearer = { ...string, description: 'Opaque bearer token returned by the API.', example: '<access_token>' };
const token = { access_token: bearer, token_type: choices('Bearer') };
const language = choices('en', 'zh-CN');
const ageGroup = choices('under_18', '18_24', '25_34', '35_44', '45_plus', 'prefer_not_to_say');
const optionalPatchText = (maxLength) => ({ ...nullableText, maxLength });
const patchList = array({ ...untrimmed, maxLength: 100 }, { maxItems: 30 });
const email = { ...string, format: 'email', maxLength: 254 };
const credentials = {
  email,
  password: { ...string, format: 'password', minLength: 10, maxLength: 128, writeOnly: true },
};
const patchProperties = {
  display_name: optionalPatchText(120),
  country: optionalPatchText(100),
  preferred_language: { ...choices('en', 'zh-CN', '', null), nullable: true, description: 'An empty string or null resets the preference to English.' },
  age_group: { ...choices(...ageGroup.enum, '', null), nullable: true },
  education: optionalPatchText(2000),
  work_experience: optionalPatchText(2000),
  interests: patchList,
  skills: patchList,
  career_goals: optionalPatchText(2000),
};
const profileProperties = {
  id,
  email: { ...email, nullable: true },
  display_name: nullableText,
  country: nullableText,
  preferred_language: language,
  age_group: { ...choices(...ageGroup.enum, null), nullable: true },
  education: nullableText,
  work_experience: nullableText,
  interests: strings,
  skills: strings,
  career_goals: nullableText,
  is_guest: bool,
  created_at: dateTime,
};
const career = {
  id,
  slug: string,
  title: string,
  cluster: string,
  summary: string,
  niche_pivot_friendly: bool,
  market_pulse: ref('MarketPulse'),
};
const range = object({ min: integer, max: integer });
const score = { ...integer, minimum: 0, maximum: 100 };
const matchFields = {
  match_percent: { ...score, minimum: 1, description: 'Relative score normalized to the top result. Interpret it as a ranking score.' },
  reason: string,
};
const provider = choices('gemini', 'ollama');
const fallbackReason = choices(
  'not_configured', 'daily_limit', 'session_limit', 'daily_limit_unavailable',
  'rate_limited', 'quota_exceeded', 'timeout', 'service_unavailable', 'network_error',
  'invalid_response', 'unavailable',
);
const savedMatchFallbackReason = choices(...fallbackReason.enum, 'not_saved');
const guidance = {
  strengths: strings,
  skills_to_develop: strings,
  roadmap: array(ref('RoadmapStep'), { minItems: 3, maxItems: 3 }),
};
const evidence = { question_id: string, quote: string, kind: choices('interest', 'experience', 'goal', 'constraint') };
const progress = {
  assessment_id: uuid,
  language,
  stage: choices('general', 'adaptive', 'clarification'),
  question: ref('Question'),
  progress: object({ answered: { ...integer, minimum: 0, maximum: 17 }, target: { ...integer, enum: [18] } }),
};
const result = {
  assessment_id: uuid,
  session_id: { ...id, nullable: true },
  user_id: id,
  completed_at: dateTime,
  language,
  trait_scores: object({ analytics: score, creativity: score, people: score, structure: score, autonomy: score }),
  directions: array(ref('Direction'), { maxItems: 3 }),
  specializations: array(ref('Specialization'), { maxItems: 5 }),
  professions: array(ref('RecommendedProfession'), { minItems: 1, maxItems: 5 }),
  custom_analysis: array(ref('CustomAnswerAnalysis')),
  personalization: { oneOf: [ref('AiPersonalization'), ref('FallbackPersonalization')] },
};
const answerFields = {
  question_id: untrimmed,
  option_id: untrimmed,
  custom_answer: { ...untrimmed, maxLength: 1000 },
  note: { ...string, maxLength: 1000 },
};
const answerChoice = [
  { required: ['option_id'] },
  { required: ['custom_answer'] },
];
const skillLevel = {
  ...integer, minimum: 1, maximum: 5,
  description: '1 = beginner, 2 = developing, 3 = independent, 4 = advanced, 5 = expert.',
};
const skillInputFields = {
  name: { ...untrimmed, maxLength: 100 },
  notes: optionalPatchText(1000),
  self_assessed_level: { ...skillLevel, nullable: true, description: skillLevel.description + ' Use null to clear your rating.' },
};
const skillRequirement = {
  name: string,
  key: string,
  target_level: { ...integer, enum: [3], description: 'Default planning target used for catalog skill names.' },
  status: choices('missing', 'unrated', 'below_target', 'meets_target'),
  priority: choices('high', 'medium', 'review', 'none'),
  skill_id: { ...id, nullable: true },
  current_level: { ...skillLevel, nullable: true },
  evidence: { ...choices('practical', 'self_reported', null), nullable: true },
};
const skillCareerIds = array(id, { minItems: 1, maxItems: 5, uniqueItems: true });
const skillGapFields = {
  target_basis: choices('default_level_3'),
  careers: array(object({
    id, slug: string, title: string, requirements_status: choices('available', 'unavailable'),
    requirements: array(ref('SkillRequirement')),
  }), { maxItems: 5 }),
  prioritized_gaps: array(object({ ...skillRequirement, career_ids: skillCareerIds })),
};
const challengeDifficulty = choices('beginner', 'intermediate', 'advanced');
const interviewEvaluationStatus = choices('pending', 'ai', 'unavailable');
const interviewScore = { points: integer, max_points: integer };
const interviewSessionSummary = {
  id: uuid,
  profession: object({ id, slug: string, title: string, career_field: string }),
  difficulty: challengeDifficulty,
  language,
  status: choices('in_progress', 'completed'),
  processing: bool,
  progress: object({ answered: { ...integer, minimum: 0, maximum: 6 }, total: { ...integer, enum: [6] } }),
  evaluation_status: interviewEvaluationStatus,
  score: { ...object(interviewScore), nullable: true },
  created_at: dateTime,
  updated_at: dateTime,
};
const interviewQuestion = object({
  id: string,
  type: choices('behavioral', 'situational', 'technical', 'problem-solving', 'follow_up'),
  text: string,
  source: choices('bank', 'ai', 'fallback'),
  relevance: choices('profession', 'career_field'),
  provider,
  reason: fallbackReason,
}, ['id', 'type', 'text', 'source', 'relevance']);
const submissionStatus = choices('submitted', 'evaluating', 'evaluated', 'unavailable');
const practiceCounts = {
  submitted_count: integer, evaluated_count: integer, latest_submission_id: uuid,
};
const challengeProgressFields = {
  challenge_id: string, ...practiceCounts, latest_status: submissionStatus, last_submitted_at: dateTime,
};
const criterion = { id: string, points: integer };
const practiceScope = choices('practice_artifact');
const challengeEvaluation = {
  ...object({
    status: choices('ai', 'unavailable'),
    scope: practiceScope,
    provider, cached: bool, reason: fallbackReason,
    points: integer, max_points: integer,
    criteria: array(object({
      ...criterion, max_points: integer, evidence: { ...nullableText, maxLength: 240 },
      feedback: { ...string, maxLength: 280 },
    })),
  }, ['status', 'scope']),
  nullable: true,
};

export const schemas = {
  InterviewCreate: {
    ...object({
      profession_slug: { ...string, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 100 },
      difficulty: challengeDifficulty,
      language: { ...language, default: 'en' },
    }, ['profession_slug', 'difficulty']),
    additionalProperties: false,
  },
  InterviewAnswer: {
    ...object({ question_id: untrimmed, answer: { ...untrimmed, maxLength: 1500 } }),
    additionalProperties: false,
  },
  InterviewHistory: object({
    sessions: array(object(interviewSessionSummary), { maxItems: 20 }),
    next_offset: { ...integer, nullable: true },
  }),
  InterviewSessionResponse: object({
    session: object({
      ...interviewSessionSummary,
      current_question: { ...interviewQuestion, nullable: true },
      transcript: array(object({ question: interviewQuestion, answer: string }), { maxItems: 6 }),
      evaluation: {
        ...object({
          status: choices('ai', 'unavailable'),
          scope: choices('practice_interview'),
          provider, cached: bool, reason: fallbackReason,
          ...interviewScore,
          strengths: strings, mistakes: strings, suggestions: strings,
          criteria: array(object({
            question_id: string, criterion_id: string,
            ...interviewScore,
            evidence: { ...nullableText, maxLength: 180 },
            feedback: { ...string, maxLength: 240 },
            suggestion: { ...nullableText, maxLength: 240 },
          })),
        }, ['status', 'scope']),
        nullable: true,
      },
      guidance: object({ examples: string, interpretation: string }),
    }),
  }),
  Error: object({ error: string }),
  Health: object({ status: choices('ok') }),
  Credentials: object(credentials),
  Registration: object({ ...credentials, display_name: optionalPatchText(120) }, ['email', 'password']),
  UserProfile: object(profileProperties),
  AuthUser: object(profileProperties, Object.keys(profileProperties).filter((field) => field !== 'created_at')),
  AuthResponse: object({ ...token, user: ref('AuthUser') }),
  IdentityResponse: object({ user: ref('UserProfile') }),
  GuestTransfer: object({ guest_access_token: bearer }),
  GuestTransferResult: object({ transferred_assessments: { ...integer, minimum: 0 } }),
  ProfilePatch: {
    ...object(patchProperties, []),
    anyOf: Object.keys(patchProperties).map((field) => ({ required: [field] })),
  },
  ProfileResponse: object({ profile: ref('UserProfile') }),
  Career: object({ ...career, tags: strings, is_active: { ...bool, enum: [true] } }),
  MarketPulse: {
    ...object({
      career_field: string,
      specializations: strings,
      education_requirements: string,
      education_market: string,
      interests: strings,
      demand: string,
      ai_impact: string,
      market_data_basis: string,
      salary_data_basis: string,
      key_skills: strings,
      salary_tiers: {
        ...object({ market: string, currency: string, period: string, basis: string, entry: range, mid: range, senior: range }, []),
        nullable: true,
      },
    }, []),
    description: 'Catalog metadata stored as JSON. Fields vary by role and additional metadata may appear.',
  },
  AssessmentStart: object({ language }, []),
  AssessmentStarted: object({ ...progress, user_id: id, ...token }, [...Object.keys(progress), 'user_id']),
  Question: object({
    id: string,
    dimension: string,
    text: string,
    source: choices('bank', 'ai', 'fallback'),
    allows_custom_answer: { ...bool, enum: [true] },
    options: array(object({ id: string, label: string })),
  }),
  BankAnswer: { ...object(answerFields, ['question_id']), oneOf: answerChoice },
  AssessmentAnswer: { ...object({ assessment_id: uuid, ...answerFields }, ['assessment_id', 'question_id']), oneOf: answerChoice },
  AssessmentInProgress: object(
    { ...progress, complete: { ...bool, enum: [false] }, clarifications: ref('ClarificationSummary') },
    [...Object.keys(progress), 'complete'],
  ),
  AssessmentCompleted: object({
    complete: { ...bool, enum: [true] },
    result: object({ ...result, clarifications: ref('ClarificationSummary') }),
  }),
  AssessmentEvaluation: object(
    { answers: array(ref('BankAnswer'), { minItems: 15, maxItems: 18 }), language },
    ['answers'],
  ),
  AssessmentEvaluated: object({ ...result, ...token }, Object.keys(result)),
  ClarificationSummary: object({
    status: choices('ai', 'mixed', 'fallback'),
    ai_questions: { ...integer, minimum: 0, maximum: 4 },
    provider,
    reason: fallbackReason,
  }, ['status', 'ai_questions']),
  CustomAnswerAnalysis: object({
    question_id: string,
    source: choices('ai', 'fallback'),
    evidence: { ...object(evidence), nullable: true },
    scoring_keywords: array(string, { maxItems: 3 }),
  }),
  Direction: object({ name: string, ...matchFields, score_basis: choices('relative_to_top_direction') }),
  Specialization: object({ name: string, ...matchFields, score_basis: choices('relative_to_top_profession') }),
  RecommendedProfession: object({
    ...career, ...matchFields, score_basis: choices('relative_to_top_profession'), ai_explanation: string,
  }, [...Object.keys(career), ...Object.keys(matchFields), 'score_basis']),
  RoadmapStep: object({ phase: string, action: string, outcome: string }),
  AiPersonalization: object({
    status: choices('ai'),
    provider,
    cached: bool,
    overview: string,
    ...guidance,
    filtered_fields: object({ overview: bool, profession_explanations: { ...integer, minimum: 0, maximum: 5 } }),
  }, ['status', 'cached', 'overview', ...Object.keys(guidance)]),
  FallbackPersonalization: object({
    status: choices('fallback'),
    reason: savedMatchFallbackReason,
    message: string,
    strengths: { ...guidance.strengths, maxItems: 0 },
    skills_to_develop: { ...guidance.skills_to_develop, maxItems: 0 },
    roadmap: array(ref('RoadmapStep'), { maxItems: 0 }),
  }),
  SkillCreate: { ...object(skillInputFields, ['name']), additionalProperties: false },
  SkillUpdate: { ...object(skillInputFields, []), minProperties: 1, additionalProperties: false },
  UserSkill: object({
    id,
    name: string,
    key: string,
    notes: nullableText,
    self_assessment: { ...object({ level: skillLevel, assessed_at: dateTime }), nullable: true },
    practical_assessment: {
      ...object({ level: skillLevel, reference: string, assessed_at: dateTime }),
      nullable: true,
      description: 'Latest practical result recorded by a trusted assessment workflow.',
    },
    created_at: dateTime,
    updated_at: dateTime,
  }),
  SkillResponse: object({ skill: ref('UserSkill') }),
  SkillList: object({ skills: array({
    allOf: [ref('UserSkill'), object({ challenge_practice: { ...object(practiceCounts), nullable: true } })],
  }) }),
  SkillCompare: {
    ...object({ career_ids: skillCareerIds, language, include_ai: { ...bool, default: true } }, ['career_ids']),
    additionalProperties: false,
  },
  SkillRequirement: object(skillRequirement),
  SkillComparison: object({
    language,
    ...skillGapFields,
    careers: { ...skillGapFields.careers, minItems: 1 },
    guidance: object({
      status: choices('ai', 'fallback', 'skipped', 'not_needed'),
      provider,
      cached: bool,
      reason: fallbackReason,
      recommendations: array(object({ skill_key: string, action: { ...string, maxLength: 280 } }), { maxItems: 5 }),
    }, ['status', 'recommendations']),
  }),
  CareerMatchRefresh: { ...object({ language }, []), additionalProperties: false },
  CareerMatch: object({
    assessment_session_id: id,
    completed_at: dateTime,
    refreshed_at: { ...dateTime, nullable: true },
    language,
    trait_scores: result.trait_scores,
    directions: result.directions,
    specializations: result.specializations,
    professions: { ...result.professions, minItems: 0 },
    personalization: result.personalization,
    skill_gaps: object(skillGapFields),
    skills: array(ref('UserSkill')),
    challenge_practice: object({
      scope: choices('practice_activity'),
      history: array(object({ ...challengeProgressFields, title: nullableText, skill_keys: strings })),
    }),
  }),
  Challenge: object({
    id: string, career_field: string, profession_slugs: strings, skills: strings, difficulty: challengeDifficulty,
    estimated_minutes: integer, title: string, description: string, instructions: string, expected_deliverable: string,
    rubric: object({ max_points: integer, criteria: array(object({ ...criterion, full_credit_when: string })) }),
  }),
  ChallengeList: object({ language, challenges: array(ref('Challenge')) }),
  ChallengeDetail: object({
    language, challenge: ref('Challenge'), execution_guidance: string, rubric_interpretation: string,
  }),
  ChallengeSubmit: {
    ...object({ artifact: { ...untrimmed, maxLength: 6000 }, language: { ...language, default: 'en' } }, ['artifact']),
    additionalProperties: false,
  },
  ChallengeProgress: object({ progress: array(object(challengeProgressFields)) }),
  ChallengeEvaluation: challengeEvaluation,
  ChallengeSubmissionResponse: object({
    submission: object({
      id: uuid, challenge_id: string, artifact: string, language, skill_keys: strings, status: submissionStatus,
      evaluation: ref('ChallengeEvaluation'),
      created_at: dateTime, updated_at: dateTime,
    }),
  }),
  LearningResourceList: object({
    language,
    resources: array(object({
      id: string, title: string, description: string, primaryCareerField: string, careerFields: strings,
      skills: strings, catalogSkillMatches: strings, difficulty: choices(...challengeDifficulty.enum, 'mixed'),
      difficultyBasis: string, prerequisites: object({ basis: string, skills: strings }),
      type: string, provider: string, url: { ...string, format: 'uri' },
      learningLanguages: strings, languageEditions: array(object({ language: string, url: { ...string, format: 'uri' } })),
      access: { type: 'object', additionalProperties: true },
      studyTime: { ...object({ estimatedMinutes: integer, basis: string, sourceUrl: string }), nullable: true },
      geography: object({ contentJurisdictions: strings, availabilityCountries: { ...strings, nullable: true } }),
      verification: object({ method: string, checkedOn: { ...string, format: 'date' } }),
    })),
  }),
};
