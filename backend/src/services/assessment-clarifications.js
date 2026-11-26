import { getQuestion } from './assessment.js';
import { localizeBankQuestion } from './assessment-language.js';
import {
  assessmentPrompt,
  CUSTOM_EVIDENCE_INSTRUCTION,
  CUSTOM_EVIDENCE_SCHEMA,
  groundedQuote,
  validateCustomEvidence,
} from './assessment-prompts.js';
import { generateAssessmentJson } from './assessment-ai.js';

const topics = {
  past_example: {
    en: ['Where would you most like to apply this interest or skill?', 'Which setting would you prefer for your next chance to use this?', 'A personal project', 'School or training', 'At work', 'In a community or volunteer setting'],
    'zh-CN': ['你最希望在哪种场合运用这项兴趣或技能？', '下次尝试时，你更希望在哪种场合运用它？', '个人项目', '学校或培训', '工作中', '社区或志愿活动'],
  },
  weekly_time: {
    en: ['How much time can you set aside each week to explore this?', 'How could you fit the time you have available into your week?', 'Under 2 hours', '2–4 hours', '5 hours or more', 'It varies from week to week'],
    'zh-CN': ['你每周可以留出多少时间来探索这项兴趣？', '你会怎样把已有的可用时间安排到一周里？', '不到两小时', '两到四小时', '五小时或以上', '每周情况不同'],
  },
  access_barrier: {
    en: ['Which resource would be hardest for you to access when exploring this?', 'Which practical resource would help you get past the biggest barrier?', 'Affordable tools or materials', 'Advice from someone in the field', 'A place or community to practise with', 'I can access what I need'],
    'zh-CN': ['探索这一方向时，哪类资源对你来说最难获得？', '哪项实际资源最能帮你克服目前最大的困难？', '负担得起的工具或材料', '业内人士的建议', '可以练习的场所或社群', '我能获得所需资源'],
  },
  trial_criterion: {
    en: ['What would count as a useful result from a small trial in this direction?', 'After trying this, what evidence would help you decide whether to continue?', 'A small finished piece of work', 'Specific feedback from someone', 'A clearer sense of which tasks I enjoyed', 'Evidence that the work fits my routine'],
    'zh-CN': ['在这个方向做一次小尝试后，什么结果对你最有用？', '尝试之后，什么证据能帮助你决定是否继续？', '一份完成的小作品或成果', '他人给出的具体反馈', '更清楚自己喜欢哪些任务', '确认这类工作适合我的日常节奏'],
  },
};
const topicNames = Object.keys(topics);
const schedulingOptions = {
  en: ['One longer session', 'Several short sessions', 'A mix of long and short sessions', 'A flexible schedule'],
  'zh-CN': ['安排一次较长的练习', '安排几次短练习', '结合长练习和短练习', '根据当周情况灵活安排'],
};
const lowCostOptions = {
  en: ['Free online resources', 'Tools I can borrow or share', 'A community programme or mentor', 'A project using materials I already have'],
  'zh-CN': ['免费的在线资源', '可借用或共享的工具', '社区项目或导师', '用现有材料开展项目'],
};

const schema = {
  type: 'object',
  properties: {
    questions: {
      type: 'array', minItems: 4, maxItems: 4,
      items: {
        type: 'object',
        properties: {
          topic: { type: 'string', enum: topicNames },
          variant: { type: 'integer', enum: [0, 1] },
          source_id: { type: 'string' },
          quote: { type: 'string' },
        },
        required: ['topic', 'variant', 'source_id', 'quote'],
      },
    },
    custom_evidence: CUSTOM_EVIDENCE_SCHEMA,
  },
  required: ['questions', 'custom_evidence'],
};

function buildQuestion(topic, language, variant, quote) {
  const strings = topics[topic][language];
  const id = `clarify-${topic}`;
  const context = language === 'zh-CN' ? `你提到“${quote}”。` : `You mentioned “${quote}”. `;
  let choices = strings.slice(2);
  let stem = strings[variant];
  if (topic === 'weekly_time' && variant === 1) choices = schedulingOptions[language];
  if (topic === 'access_barrier' && variant === 1) {
    choices = lowCostOptions[language];
    stem = language === 'zh-CN' ? '哪一种低成本资源最能帮助你迈出下一步？' : 'Which low-cost resource would help you take the next step?';
  }
  return {
    id,
    dimension: topic,
    text: quote ? context + stem : stem,
    options: choices.map((label, index) => ({ id: `${id}-${variant}-${index + 1}`, label })),
    source: quote ? 'ai' : 'fallback',
  };
}

function answerSources(answers, language) {
  return answers.map((answer) => {
    const question = localizeBankQuestion(getQuestion(answer.question_id), language);
    return {
      id: answer.question_id,
      question: question.text,
      choice: question.options.find(({ id }) => id === answer.option_id)?.label,
      custom_answer: answer.custom_answer,
      note: answer.note,
    };
  });
}

function comparableQuote(text, language) {
  const normalized = text.normalize('NFKC').toLowerCase();
  if (language === 'zh-CN') {
    const characters = [...normalized.replace(/[^\p{L}\p{N}]+/gu, '')];
    return new Set(characters.slice(1).map((character, index) => characters[index] + character));
  }
  const stopWords = /^(?:i|my|the|a|an|to|of|or|for|and|in|with|this|that)$/u;
  return new Set((normalized.match(/[\p{L}\p{N}]+/gu) || []).filter((word) => !stopWords.test(word)));
}

function repeatsQuote(words, used) {
  return [...used].some((prior) => {
    const shared = [...words].filter((word) => prior.has(word)).length;
    return shared >= 2 && shared / Math.min(words.size, prior.size) >= 0.8;
  });
}

function validateBatch(value, sources, answers, language, constraints) {
  if (!Array.isArray(value?.questions) || value.questions.length !== topicNames.length) return;
  const usedQuotes = new Set();
  const usedPhrases = new Set();
  const accepted = new Map();
  for (const item of value.questions) {
    if (!topicNames.includes(item?.topic) || accepted.has(item.topic) || ![0, 1].includes(item.variant)) continue;
    const source = sources.find(({ id }) => id === item.source_id);
    const quote = typeof item.quote === 'string' ? item.quote.trim() : '';
    if (!source || quote.length < 4 || quote.length > 100 || /[<>\n\r?？]|\b(?:ignore|override) (?:the |all )?(?:system|instructions)\b/iu.test(quote)) continue;
    if (![source.choice, source.custom_answer, source.note].some((text) => groundedQuote(text, quote))) continue;
    if (item.topic === 'weekly_time' && !constraints.knownWeeklyTime && /\b(?:hours?|minutes?)\b|小时|分钟/u.test(quote)) continue;
    const normalized = quote.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
    const words = comparableQuote(quote, language);
    if (!/\p{L}/u.test(normalized) || !words.size || repeatsQuote(words, usedPhrases)) continue;
    if ([...usedQuotes].some((used) => used.includes(normalized) || normalized.includes(used))) continue;
    usedQuotes.add(normalized);
    usedPhrases.add(words);
    const variant = questionVariant(item.topic, constraints, item.variant);
    accepted.set(item.topic, buildQuestion(item.topic, language, variant, quote));
  }
  if (accepted.size === 0) return;
  return {
    questions: topicNames.map((topic) => accepted.get(topic) || buildQuestion(topic, language, questionVariant(topic, constraints))),
    custom_evidence: validateCustomEvidence(value.custom_evidence, answers),
  };
}

function questionVariant(topic, constraints, variant = 0) {
  if (topic === 'weekly_time') return Number(constraints.knownWeeklyTime);
  if (topic === 'access_barrier') return Number(constraints.limitedBudget);
  return variant;
}

export async function prepareClarifications({ userId, answers, language, ...requestOptions }) {
  const sources = answerSources(answers, language);
  const knownWeeklyTime = answers.some(({ custom_answer, note }) => {
    const text = `${custom_answer || ''} ${note || ''}`;
    return /\b(?:hours?|minutes?)\s+(?:a|per|each)\s+week\b|\bweek(?:ly)?\b[^.!?]{0,40}\b(?:hours?|minutes?)\b|每周[^。！？]{0,25}(?:小时|分钟)/iu.test(text);
  });
  const limitedBudget = answers.some(({ custom_answer, note }) =>
    /\b(?:no|limited|small|tight|zero) budget\b|\b(?:free|low.cost) (?:tools?|resources?)\b|没有预算|预算有限|免费工具/iu
      .test(`${custom_answer || ''} ${note || ''}`));
  const constraints = { knownWeeklyTime, limitedBudget };
  const result = await generateAssessmentJson({
    userId,
    ...requestOptions,
    schema,
    maxOutputTokens: 1100,
    contents: assessmentPrompt(language, [
      'Personalize four clarification questions, one for each supplied topic. Choose a numbered wording variant and a different, relevant verbatim phrase for each.',
      'Use source_id from the answers. Quote only a specific preference, activity or goal from choice, custom_answer or note. Use 4 to 100 characters and exclude question marks.',
      'For past_example use an existing interest or skill and ask where they would prefer to apply it. For weekly_time use an interest to practise. For access_barrier use a resource constraint or an activity that needs support. For trial_criterion use a goal with an observable result.',
      'Prefer specific activities and goals from custom answers over broad choice labels. Refer to a stated amount of time only when asking how to schedule it.',
      CUSTOM_EVIDENCE_INSTRUCTION,
    ], {
      answers: sources,
      weekly_time_already_stated: knownWeeklyTime,
      limited_budget_already_stated: limitedBudget,
      topics: Object.fromEntries(topicNames.map((topic) => [topic, [
        buildQuestion(topic, language, 0).text, buildQuestion(topic, language, 1).text,
      ]])),
    }),
    validate: (value) => validateBatch(value, sources, answers, language, constraints),
  });
  if (result.status === 'ai') return result;
  return {
    ...result,
    questions: topicNames.map((topic) => buildQuestion(topic, language, questionVariant(topic, constraints))),
    custom_evidence: [],
  };
}
