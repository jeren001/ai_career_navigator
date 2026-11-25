import { getQuestion } from './assessment.js';
import { localizeBankQuestion } from './assessment-language.js';
import {
  assessmentPrompt,
  CUSTOM_EVIDENCE_INSTRUCTION,
  CUSTOM_EVIDENCE_SCHEMA,
  validateCustomEvidence,
} from './assessment-prompts.js';
import { generateAssessmentJson } from './assessment-ai.js';
export { resetGeminiStateForTests, setGeminiClientForTests } from './assessment-ai.js';
export { GEMINI_DEFAULT_MODEL } from './ai-providers.js';

const responseJsonSchema = {
  type: 'object',
  properties: {
    overview: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' }, maxItems: 2 },
    skills_to_develop: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 4 },
    custom_evidence: CUSTOM_EVIDENCE_SCHEMA,
    roadmap: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          phase: { type: 'string' },
          action: { type: 'string' },
          outcome: { type: 'string' },
        },
        required: ['phase', 'action', 'outcome'],
      },
    },
    profession_explanations: {
      type: 'array',
      minItems: 1,
      maxItems: 5,
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          explanation: { type: 'string' },
        },
        required: ['slug', 'explanation'],
      },
    },
  },
  required: ['overview', 'strengths', 'skills_to_develop', 'roadmap', 'profession_explanations'],
};

function compactInput({ answers, traitScores, recommendations, userContext, language }) {
  return {
    traits: traitScores,
    profile: userContext?.profile ? {
      country: userContext.profile.country,
      preferred_language: language || userContext.profile.preferred_language,
      age_group: userContext.profile.age_group,
      education: userContext.profile.education,
      work_experience: userContext.profile.work_experience,
      interests: userContext.profile.interests,
      skills: userContext.profile.skills || userContext.skills,
      career_goals: userContext.profile.career_goals,
    } : undefined,
    answers: answers.map(({ question_id, option_id, note, custom_answer, question }) => ({
      question_id,
      option_id,
      question: question?.text,
      selected_answer: (question || bankQuestion(question_id, language))?.options.find(({ id }) => id === option_id)?.label,
      ...(custom_answer ? { custom_answer } : {}),
      ...(note ? { note } : {}),
    })),
    directions: recommendations.directions.map(({ name, match_percent }) => ({ name, match_percent })),
    specializations: recommendations.specializations.map(({ name }) => name),
    professions: recommendations.professions.map(({ slug, title, summary, market_pulse, match_percent }) => ({
      slug,
      title,
      summary,
      education_requirements: market_pulse?.education_requirements,
      match_percent,
    })),
  };
}

function bankQuestion(id, language) {
  const question = getQuestion(id);
  return question && localizeBankQuestion(question, language);
}

function strengthEvidence(context, language) {
  const evidence = {};
  const skills = context.userContext?.profile?.skills || context.userContext?.skills || [];
  for (const [index, skill] of skills.entries()) {
    if (validText(skill, 120)) evidence[`skill-${index}`] = { label: skill.trim(), kind: 'reported' };
  }
  for (const { question_id, option_id, custom_answer } of context.answers) {
    if (validText(custom_answer, 150) &&
        /\bI (?:know|use|used|work with|worked with|have experience|have used)\b|我(?:会|熟悉|用过|使用过|曾用)/iu.test(custom_answer)) {
      evidence[question_id] = { label: custom_answer.trim(), kind: 'reported' };
      continue;
    }
    if (question_id === 'q19') continue;
    const option = bankQuestion(question_id, language)?.options.find(({ id }) => id === option_id);
    if (option) evidence[question_id] = { label: option.label, kind: 'selected' };
  }
  return evidence;
}

function promptFor(input, language) {
  return assessmentPrompt(language, [
    'Create concise, practical career guidance using only the supplied assessment signals and career catalog.',
    'Do not diagnose personality or claim that a match percentage is a probability or guarantee.',
    'Explain each supplied profession using its exact slug. Connect an answer, interest, or transferable skill to a concrete task. Mention a credential gap only when the role requires that credential and the profile indicates it is missing.',
    'For strengths, return up to two distinct keys from strength_evidence. The server quotes their text and identifies its source. Return an empty array if there is no evidence.',
    'Give two skills to develop and three brief roadmap steps. Each step should fit the stated time and budget and produce an observable result the user controls.',
    'Ground the roadmap in the stated goals and time or budget. Keep each field to one short sentence and avoid promises of employment or claims of demonstrated aptitude.',
    'Recommend a tool category or free option without making unverified claims about price, licensing, or access.',
    CUSTOM_EVIDENCE_INSTRUCTION,
  ], input);
}

function validText(value, maxLength = 500) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;
}

const abilityAssertion = /\byou (?:excel at|are (?:an? )?(?:skilled|proficient|qualified|certified|experienced|expert)|have (?:proven|demonstrated|advanced|expert)|(?:have|possess|show|demonstrate) (?:the ability|strong skills))\b|(?:\b(?:as an?|you['’]re an?) (?:certified|licensed|proficient|expert))\b|(?:你的|您的|你|您)(?:具备|展现出|已证明|精通|擅长|已取得|具有丰富)|(?:^|[，。；、]\s*)(?:擅长|精通|已取得|熟练掌握)/iu;
const verificationDemand = /\b(?:prove|verify|demonstrate) (?:your|that you have) (?:existing |reported )?(?:skill|ability|proficiency|competence)|证明你(?:的|具备)|验证你(?:的|具备)|证实你(?:的|具备)/iu;

function unsafeClaim(text) {
  return abilityAssertion.test(text) || verificationDemand.test(text) ||
    /(?:你的|您的|展现的|展现出|表现出的|体现出的)[^，。；、]{1,14}(?:能力|专长)/u.test(text) ||
    /\byour (?:proven|demonstrated)\s+[^.!?]{0,40}\b(?:skill|skills|ability|expertise)\b/iu.test(text);
}

function validateEnrichment(value, allowedSlugs, evidence, language) {
  if (!value || !validText(value.overview, 1200)) return undefined;
  if (!Array.isArray(value.strengths) || value.strengths.length > 2) return undefined;
  if (!Array.isArray(value.skills_to_develop) || value.skills_to_develop.length < 2 || value.skills_to_develop.length > 4) return undefined;
  if (!Array.isArray(value.roadmap) || value.roadmap.length !== 3) return undefined;
  if (!Array.isArray(value.profession_explanations) || value.profession_explanations.length < 1 || value.profession_explanations.length > 5) return undefined;

  const professionExplanations = {};
  let filteredExplanations = 0;
  for (const item of value.profession_explanations) {
    if (!allowedSlugs.has(item?.slug) || !validText(item?.explanation, 700)) return undefined;
    if (unsafeClaim(item.explanation)) {
      filteredExplanations += 1;
      continue;
    }
    professionExplanations[item.slug] = item.explanation.trim();
  }

  if (value.roadmap.some((item) => !validText(item?.phase, 80) || !validText(item?.action, 400) || !validText(item?.outcome, 240))) return undefined;
  if (value.skills_to_develop.some((item) => !validText(item, 200))) return undefined;
  const guidance = [...value.skills_to_develop,
    ...value.roadmap.flatMap(({ phase, action, outcome }) => [phase, action, outcome])];
  if (guidance.some(unsafeClaim)) return undefined;
  const filteredOverview = unsafeClaim(value.overview);
  const overview = filteredOverview
    ? (language === 'zh-CN' ? '以下行动计划基于你的回答、兴趣和职业目标。' : 'The roadmap draws on your answers, interests, and career goals.')
    : value.overview.trim();
  const selected = value.strengths
    .filter((id) => typeof id === 'string' && Object.hasOwn(evidence, id))
    .map((id) => evidence[id]);
  const prefixes = language === 'zh-CN'
    ? { reported: '你自述过', selected: '你选择了' }
    : { reported: 'You reported', selected: 'You selected' };
  const rankedEvidence = selected.length ? selected : Object.values(evidence);
  const strengths = [...new Set(rankedEvidence.map(({ label, kind }) => `${prefixes[kind]} “${label}”`))].slice(0, 2);

  return {
    overview,
    strengths,
    skills_to_develop: value.skills_to_develop.map((item) => item.trim()),
    roadmap: value.roadmap.map(({ phase, action, outcome }) => ({
      phase: phase.trim(), action: action.trim(), outcome: outcome.trim(),
    })),
    profession_explanations: professionExplanations,
    filtered_fields: { overview: filteredOverview, profession_explanations: filteredExplanations },
  };
}

export function enrichRecommendations(context) {
  const language = context.language || context.userContext?.profile?.preferred_language || 'en';
  const evidence = strengthEvidence(context, language);
  const input = { ...compactInput({ ...context, language }), strength_evidence: evidence };
  const allowedSlugs = new Set(input.professions.map((profession) => profession.slug));
  return generateAssessmentJson({
    userId: context.userId,
    contents: promptFor(input, language),
    schema: responseJsonSchema,
    maxOutputTokens: language === 'zh-CN' || context.answers.some(({ custom_answer }) => custom_answer) ? 900 : 600,
    beforeRequest: context.beforeRequest,
    maxAttempts: context.maxAttempts,
    quotaReason: context.quotaReason || 'daily_limit',
    waitForSlot: context.waitForSlot,
    validate(value) {
      const enrichment = validateEnrichment(value, allowedSlugs, evidence, language);
      if (!enrichment) return undefined;
      return { ...enrichment, custom_evidence: validateCustomEvidence(value.custom_evidence, context.answers) };
    },
  });
}

export function addEnrichment(recommendations, enrichment, language = 'en') {
  if (enrichment.status !== 'ai') {
    return {
      ...recommendations,
      personalization: {
        status: 'fallback',
        reason: enrichment.reason,
        message: language === 'zh-CN' ? '推荐基于规则评分结果。' : 'Recommendations use the deterministic assessment results.',
        strengths: [],
        skills_to_develop: [],
        roadmap: [],
      },
    };
  }

  return {
    ...recommendations,
    professions: recommendations.professions.map((profession) => ({
      ...profession,
      ...(enrichment.profession_explanations[profession.slug]
        ? { ai_explanation: enrichment.profession_explanations[profession.slug] }
        : {}),
    })),
    personalization: {
      status: 'ai',
      ...(enrichment.provider ? { provider: enrichment.provider } : {}),
      cached: enrichment.cached,
      ...(enrichment.filtered_fields?.overview || enrichment.filtered_fields?.profession_explanations
        ? { filtered_fields: enrichment.filtered_fields }
        : {}),
      overview: enrichment.overview,
      strengths: enrichment.strengths,
      skills_to_develop: enrichment.skills_to_develop,
      roadmap: enrichment.roadmap,
    },
  };
}
