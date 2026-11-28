import { randomUUID } from 'node:crypto';
import questionBank from '../../database/assessment-question-bank.json' with { type: 'json' };

export const GENERAL_QUESTION_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q19'];
export const CLARIFICATION_START = GENERAL_QUESTION_IDS.length + 8;
const MAX_QUESTIONS = 18;
const NOTE_SIGNALS = {
  analysis: ['analytics', 'research'],
  data: ['analytics', 'data'],
  statistics: ['statistics', 'analytics'],
  coding: ['coding', 'technology'],
  programming: ['coding', 'technology'],
  design: ['creativity', 'visual-design'],
  drawing: ['creativity', 'visual-design'],
  writing: ['writing', 'communication'],
  reading: ['research', 'writing'],
  teaching: ['education', 'people'],
  mentoring: ['people', 'communication'],
  helping: ['people', 'empathy'],
  healthcare: ['healthcare', 'people'],
  health: ['healthcare', 'people'],
  environment: ['science', 'public-service'],
  business: ['strategy', 'operations'],
  organizing: ['organization', 'structure'],
  building: ['coding', 'creativity'],
  making: ['creativity', 'hands-on'],
  photography: ['creativity', 'visual-design'],
  music: ['creativity', 'storytelling'],
  video: ['creativity', 'storytelling'],
  games: ['creativity', 'coding'],
  people: ['people', 'communication'],
  science: ['science', 'research'],
  systems: ['analytics', 'structure'],
};
const FIELD_ALIASES = {
  'Tech & Data': ['Technology & AI'],
  'Design & Creative': ['Art & Design'],
  'Business & Product': ['Business & Finance'],
  'People & Psychology/Education': ['Psychology & Mental Health', 'Education & Research'],
  'Science & Health/Environment': ['Medicine & Healthcare', 'Environment & Social Impact'],
  'Communication & Law/Operations': ['Media & Communication', 'Law & Legal'],
};

const LEGACY_QUESTIONS = [
  {
    id: 'q1',
    dimension: 'personality',
    text: 'Which kind of work feels most energising?',
    options: [
      { id: 'q1-analytical', label: 'Finding patterns, testing ideas, and solving puzzles', weights: { analytics: 3, research: 1 } },
      { id: 'q1-creative', label: 'Creating concepts, visuals, or new experiences', weights: { creativity: 3, 'visual-design': 2 } },
      { id: 'q1-people', label: 'Understanding people and helping them move forward', weights: { people: 3, communication: 1 } },
      { id: 'q1-building', label: 'Building, improving, or operating useful things', weights: { coding: 2, structure: 2, autonomy: 1 } },
    ],
  },
  {
    id: 'q2',
    dimension: 'abilities',
    text: 'When a problem is unclear, what do you usually do first?',
    options: [
      { id: 'q2-break-down', label: 'Break it into smaller parts and look for evidence', weights: { analytics: 3, structure: 2 } },
      { id: 'q2-ask', label: 'Talk with people involved to understand the real need', weights: { people: 2, interviewing: 2, research: 1 } },
      { id: 'q2-prototype', label: 'Try a rough solution and learn from what happens', weights: { creativity: 2, experimentation: 2, autonomy: 1 } },
      { id: 'q2-process', label: 'Find a reliable process and improve it step by step', weights: { structure: 3, quality: 1, operations: 1 } },
    ],
  },
  {
    id: 'q3',
    dimension: 'work_preferences',
    text: 'How much interaction with other people do you prefer in a normal workday?',
    options: [
      { id: 'q3-deep-focus', label: 'Mostly independent focus time', weights: { autonomy: 3, coding: 1, research: 1 } },
      { id: 'q3-balanced', label: 'A balance of focus time and collaboration', weights: { structure: 1, people: 1, autonomy: 1 } },
      { id: 'q3-collaborative', label: 'Frequent collaboration with a small team', weights: { people: 2, communication: 2, 'stakeholder-management': 1 } },
      { id: 'q3-client-facing', label: 'Regular conversations with clients, users, or the public', weights: { people: 3, presenting: 2, consulting: 1 } },
    ],
  },
  {
    id: 'q4',
    dimension: 'work_preferences',
    text: 'Which work environment sounds most sustainable for you?',
    options: [
      { id: 'q4-clear', label: 'Clear goals, standards, and predictable routines', weights: { structure: 3, quality: 1, operations: 1 } },
      { id: 'q4-flexible', label: 'Flexible goals with room to choose the approach', weights: { autonomy: 3, creativity: 1 } },
      { id: 'q4-fast', label: 'A fast-moving environment with changing priorities', weights: { experimentation: 2, autonomy: 2, strategy: 1 } },
      { id: 'q4-mission', label: 'A mission-led environment where the human impact is visible', weights: { people: 2, healthcare: 1, 'public-service': 1 } },
    ],
  },
  {
    id: 'q5',
    dimension: 'interests',
    text: 'What kind of outcome would make your work feel meaningful?',
    options: [
      { id: 'q5-insight', label: 'A clearer decision based on good evidence', weights: { analytics: 3, research: 1 }, fieldWeights: { 'Technology & AI': 1 } },
      { id: 'q5-experience', label: 'A better, more accessible, or more delightful experience', weights: { creativity: 2, 'user-experience': 2, accessibility: 1 }, fieldWeights: { 'Art & Design': 1 } },
      { id: 'q5-growth', label: 'A product, organisation, or community making progress', weights: { strategy: 2, people: 1, leadership: 1 }, fieldWeights: { 'Business & Product': 1 } },
      { id: 'q5-wellbeing', label: 'People becoming healthier, safer, or more supported', weights: { people: 2, healthcare: 2, 'public-service': 1 }, fieldWeights: { 'Science & Health/Environment': 2, 'People & Psychology/Education': 1 } },
    ],
  },
  {
    id: 'q6',
    dimension: 'abilities',
    focus: ['analytics', 'research'],
    text: 'Which data task sounds most satisfying?',
    options: [
      { id: 'q6-query', label: 'Writing queries and finding a useful pattern', weights: { analytics: 3, sql: 2, databases: 1 }, fieldWeights: { 'Technology & AI': 1 } },
      { id: 'q6-model', label: 'Building a model to explain or predict an outcome', weights: { analytics: 3, statistics: 2, 'machine-learning': 2 }, fieldWeights: { 'Technology & AI': 2 } },
      { id: 'q6-story', label: 'Turning evidence into a clear story for a decision-maker', weights: { analytics: 2, visualization: 2, storytelling: 2 }, fieldWeights: { 'Business & Product': 1 } },
      { id: 'q6-none', label: 'I would rather work with people, words, or physical materials', weights: { people: 1, creativity: 1 } },
    ],
  },
  {
    id: 'q7',
    dimension: 'skills',
    focus: ['coding', 'technology', 'structure'],
    text: 'Which technology task would you most like to practise?',
    options: [
      { id: 'q7-software', label: 'Designing and testing software or APIs', weights: { coding: 3, apis: 2, testing: 1 }, fieldWeights: { 'Technology & AI': 2 } },
      { id: 'q7-data', label: 'Building reliable data pipelines and systems', weights: { coding: 2, 'data-quality': 2, automation: 2 }, fieldWeights: { 'Technology & AI': 2 } },
      { id: 'q7-security', label: 'Investigating security, reliability, or operational issues', weights: { security: 2, investigation: 2, reliability: 1 }, fieldWeights: { 'Technology & AI': 1 } },
      { id: 'q7-support', label: 'Helping someone solve a device or access problem', weights: { troubleshooting: 2, people: 2, 'customer-service': 1 }, fieldWeights: { 'Technology & AI': 1 } },
    ],
  },
  {
    id: 'q8',
    dimension: 'skills',
    focus: ['creativity', 'visual-design'],
    text: 'Which creative challenge appeals to you most?',
    options: [
      { id: 'q8-interface', label: 'Designing an interface that is easy to use', weights: { 'visual-design': 2, 'user-experience': 3, prototyping: 2 }, fieldWeights: { 'Art & Design': 2 } },
      { id: 'q8-visual', label: 'Creating a visual identity, layout, or illustration', weights: { 'visual-design': 3, creativity: 2, typography: 2 }, fieldWeights: { 'Art & Design': 2 } },
      { id: 'q8-motion', label: 'Using movement, sound, or video to tell a story', weights: { creativity: 3, motion: 2, storytelling: 2 }, fieldWeights: { 'Media & Communication': 2 } },
      { id: 'q8-practical', label: 'Making a physical space or object work beautifully', weights: { creativity: 2, materials: 2, 'spatial-design': 2 }, fieldWeights: { 'Art & Design': 1, 'Engineering & Architecture': 1 } },
    ],
  },
  {
    id: 'q9',
    dimension: 'skills',
    focus: ['communication', 'people', 'writing'],
    text: 'Which communication task feels most natural?',
    options: [
      { id: 'q9-explain', label: 'Explain a complex topic clearly in writing', weights: { writing: 3, documentation: 2, communication: 2 }, fieldWeights: { 'Media & Communication': 1 } },
      { id: 'q9-present', label: 'Present an idea and answer questions live', weights: { presenting: 3, communication: 2, people: 1 }, fieldWeights: { 'Business & Product': 1 } },
      { id: 'q9-listen', label: 'Listen carefully and help someone feel understood', weights: { people: 3, interviewing: 2, empathy: 2 }, fieldWeights: { 'People & Psychology/Education': 2 } },
      { id: 'q9-investigate', label: 'Interview people and turn what you learn into a story', weights: { interviewing: 3, research: 2, storytelling: 2 }, fieldWeights: { 'Media & Communication': 1 } },
    ],
  },
  {
    id: 'q10',
    dimension: 'interests',
    focus: ['research', 'analytics'],
    text: 'Which question would you most enjoy investigating?',
    options: [
      { id: 'q10-market', label: 'Why do customers choose one product over another?', weights: { research: 2, analytics: 2, strategy: 1 }, fieldWeights: { 'Business & Product': 2 } },
      { id: 'q10-human', label: 'How do people think, learn, or behave?', weights: { research: 2, people: 2, psychology: 2 }, fieldWeights: { 'People & Psychology/Education': 2 } },
      { id: 'q10-health', label: 'How can evidence improve health or the environment?', weights: { research: 2, healthcare: 2, science: 2 }, fieldWeights: { 'Science & Health/Environment': 3 } },
      { id: 'q10-systems', label: 'How can a complex system be made safer or more efficient?', weights: { analytics: 2, structure: 2, operations: 2 }, fieldWeights: { 'Science & Health/Environment': 1, 'Technology & AI': 1 } },
    ],
  },
  {
    id: 'q11',
    dimension: 'interests',
    focus: ['people', 'healthcare'],
    text: 'Which kind of support would you prefer to provide?',
    options: [
      { id: 'q11-learn', label: 'Help someone learn a skill or understand a concept', weights: { people: 2, education: 2, communication: 1 }, fieldWeights: { 'People & Psychology/Education': 2 } },
      { id: 'q11-care', label: 'Support someone through a health or wellbeing challenge', weights: { people: 3, healthcare: 3, empathy: 1 }, fieldWeights: { 'Science & Health/Environment': 3 } },
      { id: 'q11-community', label: 'Improve a public service or community programme', weights: { 'public-service': 3, people: 2, operations: 1 }, fieldWeights: { 'Communication & Law/Operations': 1 } },
      { id: 'q11-product', label: 'Make a product more useful for the people who rely on it', weights: { 'user-experience': 2, people: 2, 'product-design': 1 }, fieldWeights: { 'Business & Product': 1, 'Art & Design': 1 } },
    ],
  },
  {
    id: 'q12',
    dimension: 'interests',
    focus: ['creativity', 'autonomy'],
    text: 'Which hobby or personal project sounds closest to you?',
    options: [
      { id: 'q12-making', label: 'Making things: crafts, cooking, DIY, or hardware', weights: { creativity: 2, materials: 2, 'hands-on': 2 } },
      { id: 'q12-digital', label: 'Building digital projects, games, or websites', weights: { coding: 2, creativity: 2, autonomy: 2 } },
      { id: 'q12-expression', label: 'Writing, drawing, photography, music, or video', weights: { creativity: 3, storytelling: 2, 'visual-design': 1 } },
      { id: 'q12-community', label: 'Organising activities or helping groups of people', weights: { people: 2, organization: 2, leadership: 1 } },
    ],
  },
  {
    id: 'q13',
    dimension: 'work_preferences',
    focus: ['structure', 'operations'],
    text: 'What type of progress is most motivating?',
    options: [
      { id: 'q13-system', label: 'A process becomes faster, safer, or more reliable', weights: { structure: 3, operations: 2, quality: 1 } },
      { id: 'q13-product', label: 'A product becomes more valuable to its users', weights: { product: 2, strategy: 2, 'user-experience': 1 } },
      { id: 'q13-project', label: 'A complex project reaches a clear milestone', weights: { organization: 2, planning: 2, leadership: 1 } },
      { id: 'q13-insight', label: 'A new insight changes what a team decides to do', weights: { analytics: 2, research: 2, communication: 1 } },
    ],
  },
  {
    id: 'q14',
    dimension: 'interests',
    focus: ['strategy', 'people', 'communication'],
    text: 'Which business or product problem would you enjoy owning?',
    options: [
      { id: 'q14-priorities', label: 'Decide what a team should build next', weights: { strategy: 3, prioritization: 2, product: 2 }, fieldWeights: { 'Business & Product': 2 } },
      { id: 'q14-customer', label: 'Understand a customer need and shape a useful solution', weights: { consulting: 2, people: 2, 'user-experience': 1 }, fieldWeights: { 'Business & Product': 2 } },
      { id: 'q14-growth', label: 'Help an organisation reach and retain the right audience', weights: { marketing: 3, strategy: 2, analytics: 1 }, fieldWeights: { 'Business & Product': 2 } },
      { id: 'q14-impact', label: 'Balance outcomes, resources, and stakeholder needs', weights: { leadership: 2, 'stakeholder-management': 2, 'public-service': 1 }, fieldWeights: { 'Communication & Law/Operations': 1 } },
    ],
  },
  {
    id: 'q15',
    dimension: 'hobbies',
    focus: ['creativity', 'people', 'analytics'],
    text: 'What do you naturally spend extra time learning about?',
    options: [
      { id: 'q15-tech', label: 'Technology, science, or how systems work', weights: { technology: 2, analytics: 2, coding: 1 } },
      { id: 'q15-culture', label: 'Culture, media, design, or stories', weights: { creativity: 2, storytelling: 2, 'visual-design': 1 } },
      { id: 'q15-people', label: 'People, society, education, or wellbeing', weights: { people: 2, psychology: 2, education: 1 } },
      { id: 'q15-world', label: 'Business, current affairs, or how organisations operate', weights: { strategy: 2, operations: 2, research: 1 } },
    ],
  },
  {
    id: 'q16',
    dimension: 'abilities',
    focus: ['learning', 'autonomy'],
    text: 'What is your preferred way to build a new skill?',
    options: [
      { id: 'q16-course', label: 'Follow a structured course and practise deliberately', weights: { structure: 2, education: 1, quality: 1 } },
      { id: 'q16-project', label: 'Start a project and learn what I need along the way', weights: { autonomy: 3, experimentation: 2, coding: 1 } },
      { id: 'q16-mentor', label: 'Learn through feedback from an experienced person', weights: { people: 2, communication: 1, 'stakeholder-management': 1 } },
      { id: 'q16-research', label: 'Read widely, compare sources, and form my own view', weights: { research: 3, analytics: 1, autonomy: 1 } },
    ],
  },
  {
    id: 'q17',
    dimension: 'work_preferences',
    focus: ['structure', 'autonomy', 'people'],
    text: 'Which trade-off would you choose?',
    options: [
      { id: 'q17-stability', label: 'More stability and clear expectations', weights: { structure: 3, operations: 1 } },
      { id: 'q17-freedom', label: 'More freedom, even when the path is uncertain', weights: { autonomy: 3, creativity: 1 } },
      { id: 'q17-impact', label: 'More direct human impact, even when it is emotionally demanding', weights: { people: 3, empathy: 2, 'public-service': 1 } },
      { id: 'q17-growth', label: 'More challenge and growth, even when priorities change', weights: { experimentation: 2, strategy: 2, autonomy: 1 } },
    ],
  },
  {
    id: 'q18',
    dimension: 'preferences',
    focus: ['coding', 'creativity', 'people', 'analytics'],
    text: 'Which next step would you be most willing to try?',
    options: [
      { id: 'q18-build', label: 'Build a small technical or data project', weights: { coding: 2, analytics: 2, autonomy: 1 } },
      { id: 'q18-portfolio', label: 'Create a design, writing, or media portfolio piece', weights: { creativity: 3, 'visual-design': 1, writing: 1 } },
      { id: 'q18-conversation', label: 'Interview someone and reflect on what you learn', weights: { people: 2, interviewing: 2, research: 1 } },
      { id: 'q18-process', label: 'Improve a real process and document the result', weights: { structure: 2, operations: 2, communication: 1 } },
    ],
  },
  {
    id: 'q19',
    dimension: 'career_stage',
    text: 'Which stage best describes your career search today?',
    options: [
      { id: 'q19-exploring', label: 'Exploring options before choosing a first direction' },
      { id: 'q19-entering', label: 'Preparing for a first job or internship' },
      { id: 'q19-changing', label: 'Changing direction after working in another area' },
      { id: 'q19-growing', label: 'Developing further in my current field' },
    ],
  },
];

const ADAPTIVE_QUESTIONS = questionBank.questions;
const QUESTIONS = [...LEGACY_QUESTIONS, ...ADAPTIVE_QUESTIONS];
const QUESTIONS_BY_ID = new Map(QUESTIONS.map((question) => [question.id, question]));

function cleanOption(option) {
  return { id: option.id, label: option.label };
}

export function publicQuestion(question) {
  return {
    id: question.id,
    dimension: question.dimension,
    text: question.text,
    options: question.options.map(cleanOption),
  };
}

export function getQuestion(questionId) {
  return QUESTIONS_BY_ID.get(questionId);
}

export function initialQuestion() {
  return publicQuestion(QUESTIONS_BY_ID.get(GENERAL_QUESTION_IDS[0]));
}

function addScores(target, source) {
  for (const [key, value] of Object.entries(source || {})) {
    target[key] = (target[key] || 0) + value;
  }
}

export function collectSignals(answers) {
  const signals = { fields: {}, tags: {} };

  for (const answer of answers) {
    const question = getQuestion(answer.question_id);
    const option = question?.options.find((candidate) => candidate.id === answer.option_id);
    if (!question) continue;
    for (const tag of scoringKeywords(answer)) addScores(signals.tags, { [tag]: 1 });
    if (!option) continue;
    addScores(signals.tags, option.weights);
    addScores(signals.fields, option.fieldWeights);
    if (question.category) continue;
    for (const match of answer.note?.toLowerCase().matchAll(/[a-z]+/g) || []) {
      if (Object.hasOwn(NOTE_SIGNALS, match[0])) {
        addScores(signals.tags, Object.fromEntries(NOTE_SIGNALS[match[0]].map((tag) => [tag, 1])));
      }
    }
  }

  return signals;
}

const CHINESE_SIGNALS = [
  ['数据分析', ['analytics', 'data']], ['统计', ['statistics', 'analytics']],
  ['编程', ['coding', 'technology']], ['视觉设计', ['creativity', 'visual-design']],
  ['摄影', ['creativity', 'visual-design']], ['写作', ['writing', 'communication']],
  ['教学', ['education', 'people']], ['健康科普', ['healthcare', 'communication']],
  ['公益', ['public-service', 'people']], ['社区活动', ['organization', 'people']],
];

export function customKeywordMatches(text) {
  const tags = new Set();
  for (const clause of text.toLowerCase().split(/[.!?;。！？；\n]/u)) {
    if (hasExplicitNegation(clause)) continue;
    for (const word of clause.match(/[a-z]+/g) || []) {
      if (Object.hasOwn(NOTE_SIGNALS, word)) NOTE_SIGNALS[word].forEach((tag) => tags.add(tag));
    }
    for (const [phrase, matches] of CHINESE_SIGNALS) {
      if (clause.includes(phrase)) matches.forEach((tag) => tags.add(tag));
    }
  }
  return [...tags].slice(0, 3);
}

export function scoringKeywords({ question_id, custom_answer }) {
  const question = getQuestion(question_id);
  return custom_answer && question && !question.category ? customKeywordMatches(custom_answer) : [];
}

export function hasExplicitNegation(text) {
  return /\b(?:no|not|never|without|avoid|dislike|don['’]t|cannot)\b|不|没有|无意/iu.test(text);
}

function strongestSignals(signals) {
  return Object.entries(signals.tags)
    .sort(([, left], [, right]) => right - left)
    .map(([key]) => key);
}

export function selectNextQuestion(answers) {
  const answered = new Set(answers.map((answer) => answer.question_id));
  if (answers.length < GENERAL_QUESTION_IDS.length) {
    return QUESTIONS_BY_ID.get(GENERAL_QUESTION_IDS[answers.length]);
  }

  const signals = collectSignals(answers);
  const strongest = strongestSignals(signals);
  const shown = ADAPTIVE_QUESTIONS.filter(({ id }) => answered.has(id));
  const categories = new Set(shown.map(({ category }) => category));
  const fields = new Set(shown.flatMap(offeredFields));
  const needsInterdisciplinary = shown.filter(isInterdisciplinary).length < 2;
  return ADAPTIVE_QUESTIONS.filter(({ id }) => !answered.has(id))
    .map((question) => ({
      question,
      coverage: Number(!categories.has(question.category)),
      interdisciplinary: Number(needsInterdisciplinary && isInterdisciplinary(question)),
      newFields: offeredFields(question).filter((field) => !fields.has(field)).length,
      score: Math.max(0, ...(question.focus || []).map((focus) => strongest.indexOf(focus) === -1 ? 0 : strongest.length - strongest.indexOf(focus))),
    }))
    .sort((a, b) => b.coverage - a.coverage || b.interdisciplinary - a.interdisciplinary ||
      (fields.size < 6 ? b.newFields - a.newFields : 0) ||
      b.score - a.score || b.newFields - a.newFields)[0]?.question;
}

function offeredFields(question) {
  return [...new Set(question.options.flatMap((option) => Object.keys(option.fieldWeights || {})))];
}

function isInterdisciplinary(question) {
  return question.options.some((option) => Object.keys(option.fieldWeights || {}).length > 1);
}

function traitScores(signals) {
  const tag = (name) => signals.tags[name] || 0;
  const raw = {
    analytics: tag('analytics') + tag('statistics') + tag('research'),
    creativity: tag('creativity') + tag('visual-design') + tag('storytelling'),
    people: tag('people') + tag('communication') + tag('empathy'),
    structure: tag('structure') + tag('quality') + tag('organization') + tag('operations'),
    autonomy: tag('autonomy') + tag('independence') + tag('experimentation'),
  };
  const max = Math.max(1, ...Object.values(raw));
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, Math.round((value / max) * 100)]));
}

function roleTags(role) {
  return Array.isArray(role.tags) ? role.tags.map((tag) => String(tag).toLowerCase()) : [];
}

function roleField(role) {
  return role.market_pulse?.career_field || role.market_pulse?.careerField || 'Other';
}

function roleScore(role, signals) {
  const tags = roleTags(role);
  const tagScore = tags.reduce((total, tag) => total + (signals.tags[tag] || 0), 0);
  const field = roleField(role);
  const fieldScore = Object.entries(signals.fields).reduce((total, [signal, weight]) => {
    const matches = signal === field || FIELD_ALIASES[signal]?.includes(field);
    return total + (matches ? weight : 0);
  }, 0);
  // Explicit field choices guide ranking while tag overlap keeps adjacent roles viable.
  return 1 + tagScore + (fieldScore * 8);
}

function reasonForRole(role, signals, language) {
  const matched = roleTags(role)
    .map((tag) => ({ tag, score: signals.tags[tag] || 0 }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ tag }) => tag.replaceAll('-', ' '));
  const field = roleField(role);
  if (language === 'zh-CN') {
    const evidence = matched.length ? `你的回答中提到的相关方向（${matched.join('、')}）` : '你的总体偏好';
    return `此职业与${evidence}相符${signals.fields[field] ? `，也与你对 ${field} 的兴趣有关` : ''}。`;
  }
  const evidence = matched.length ? matched.join(', ') : 'your broad preferences';
  return `This fits your signals around ${evidence}${signals.fields[field] ? ` and your interest in ${field}` : ''}.`;
}

function percent(score, scores) {
  const max = Math.max(...scores, 1);
  return Math.max(1, Math.round((score / max) * 100));
}

function recommendations(roles, signals, language) {
  const scored = roles
    .map((role) => ({ role, score: roleScore(role, signals) }))
    .sort((left, right) => right.score - left.score || left.role.id - right.role.id);
  const scores = scored.map(({ score }) => score);

  const directionMap = new Map();
  for (const { role, score } of scored) {
    const field = roleField(role);
    const current = directionMap.get(field) || { scores: [], roles: [] };
    current.scores.push(score);
    current.roles.push(role);
    directionMap.set(field, current);
  }
  const directions = [...directionMap.entries()]
    .map(([name, value]) => {
      const score = value.scores.reduce((total, item) => total + item, 0) / value.scores.length;
      return {
      name,
      score,
      match_percent: percent(score, [...directionMap.values()].map(({ scores }) => scores.reduce((total, item) => total + item, 0) / scores.length)),
      score_basis: 'relative_to_top_direction',
      reason: directionReason(name, value.roles, signals, language),
      };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map(({ score, ...direction }) => direction);

  const specializationMap = new Map();
  for (const { role, score } of scored) {
    const specializations = role.market_pulse?.specializations || [];
    for (const name of specializations) {
      const current = specializationMap.get(name) || { score: 0, role: role.title };
      current.score = Math.max(current.score, score);
      specializationMap.set(name, current);
    }
  }
  const specializations = [...specializationMap.entries()]
    .map(([name, value]) => ({
      name,
      match_percent: percent(value.score, scores),
      score_basis: 'relative_to_top_profession',
      reason: language === 'zh-CN' ? `此专业方向与你匹配度最高的职业之一（${value.role}）相关。`
        : `This specialization connects to your strongest matching profession, ${value.role}.`,
    }))
    .sort((left, right) => right.match_percent - left.match_percent || left.name.localeCompare(right.name))
    .slice(0, 5);

  const professions = scored.slice(0, 5).map(({ role, score }) => ({
    id: role.id,
    slug: role.slug,
    title: role.title,
    cluster: role.cluster,
    summary: role.summary,
    niche_pivot_friendly: role.niche_pivot_friendly,
    market_pulse: role.market_pulse,
    match_percent: percent(score, scores),
    score_basis: 'relative_to_top_profession',
    reason: reasonForRole(role, signals, language),
  }));

  return { directions, specializations, professions };
}

function directionReason(field, roles, signals, language) {
  const matchedTags = new Map();
  for (const role of roles) {
    for (const tag of roleTags(role)) {
      if (signals.tags[tag]) matchedTags.set(tag, signals.tags[tag]);
    }
  }
  const evidence = [...matchedTags.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([tag]) => tag.replaceAll('-', ' '));
  const reason = evidence.length ? evidence.join(', ') : 'your broad preferences';
  if (language === 'zh-CN') {
    const preferences = evidence.length ? `相关方向（${evidence.join('、')}）` : '总体偏好';
    return `你的回答体现了${preferences}，与 ${field} 领域的职业相符。`;
  }
  return `Your answers point to ${reason}, which aligns with ${field} roles.`;
}

export function evaluateAnswers(answers, roles, language = 'en') {
  const signals = collectSignals(answers);
  return {
    trait_scores: traitScores(signals),
    recommendations: recommendations(roles, signals, language),
  };
}

export async function loadActiveCareers(database) {
  const { rows } = await database.query('SELECT * FROM career_roles WHERE is_active = TRUE ORDER BY id');
  if (!rows.length) {
    throw Object.assign(new Error('No active career roles are available'), { status: 503 });
  }
  return rows;
}

function validateAnswersInternal(rawAnswers, { minimum = 1, maximum = MAX_QUESTIONS, questionFor = getQuestion } = {}) {
  if (!Array.isArray(rawAnswers) || rawAnswers.length < minimum || rawAnswers.length > maximum) {
    throw new Error(`answers must contain between ${minimum} and ${maximum} items`);
  }
  const seen = new Set();
  return rawAnswers.map((answer) => {
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      throw new Error('Each answer must be an object');
    }
    const { question_id: questionId, option_id: optionId, custom_answer: customAnswer, note } = answer;
    const question = questionFor(questionId);
    if (!question) throw new Error(`Unknown question_id: ${questionId}`);
    if (seen.has(questionId)) throw new Error(`Question answered more than once: ${questionId}`);
    seen.add(questionId);
    if (customAnswer !== undefined && (typeof customAnswer !== 'string' || !customAnswer.trim() ||
        customAnswer.length > 1000 || customAnswer.includes('\0') || !customAnswer.isWellFormed())) {
      throw new Error('custom_answer must be a non-empty string with at most 1000 characters');
    }
    if (customAnswer !== undefined && optionId !== undefined) {
      throw new Error('Provide either option_id or custom_answer');
    }
    if (customAnswer === undefined && !question.options.some((option) => option.id === optionId)) {
      throw new Error(`Invalid option_id for ${questionId}`);
    }
    if (note !== undefined && (typeof note !== 'string' || note.length > 1000 ||
        note.includes('\0') || !note.isWellFormed())) {
      throw new Error('note must be a string with at most 1000 characters');
    }
    return {
      question_id: questionId,
      ...(customAnswer !== undefined ? { custom_answer: customAnswer.trim() } : { option_id: optionId }),
      ...(note ? { note: note.trim() } : {}),
    };
  });
}

export function validateAnswers(rawAnswers, options) {
  try {
    return validateAnswersInternal(rawAnswers, options);
  } catch (error) {
    error.status = error.status || 400;
    throw error;
  }
}

export function createAssessmentState(userId) {
  return {
    id: randomUUID(),
    userId,
    answers: [],
    createdAt: new Date().toISOString(),
  };
}

export { MAX_QUESTIONS, QUESTIONS };
