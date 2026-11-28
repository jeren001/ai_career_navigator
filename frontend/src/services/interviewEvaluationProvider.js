import { evaluationCategories } from './interviewResultsModel.js'
import { entryKey } from './interviewSetupConfig.js'

const states = ['unavailable', 'pending', 'processing', 'completed', 'failed']
const text = value => typeof value === 'string' && Boolean(value.trim())
const score = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100
const optional = (value, check) => value === undefined || value === null || check(value)
const textList = value => Array.isArray(value) && value.every(text)
const identifier = value => typeof value === 'string' && /^[a-z0-9][a-z0-9._-]*$/i.test(value)
const categoryId = label => label.toLowerCase().replace(/ +/g, '-')
const uniqueBy = (items, field) => new Set(items.map(item => item[field])).size === items.length

function validFocus(focus, configuration) {
  const types = configuration.interviewType === 'custom' ? configuration.types : [configuration.interviewType]
  return Array.isArray(focus) && focus.every(item => item && types.includes(item.type) &&
    textList(item.entries) && item.entries.length && new Set(item.entries.map(entryKey)).size === item.entries.length) &&
    uniqueBy(focus, 'type')
}

export function validateInterviewEvaluation(response, session) {
  const failed = { sessionId: session.id, status: 'failed' }
  if (!response || response.sessionId !== session.id || !states.includes(response.status)) return failed
  if (response.status !== 'completed') return { sessionId: session.id, status: response.status }

  const allowed = evaluationCategories(session.configuration)
  const answered = new Set(session.answers.map(answer => answer.questionId))
  const { categories, questions, overallScore, performanceLevel, evaluatedAt, feedback, practiceFocus, methodology } = response
  if (!score(overallScore) || !text(performanceLevel) || !text(evaluatedAt) || !Number.isFinite(Date.parse(evaluatedAt)) ||
      !optional(methodology, item => Boolean(item && identifier(item.id) && identifier(item.version))) ||
      !Array.isArray(categories) || !categories.every(item => item && allowed.includes(item.label) && score(item.score) &&
        optional(item.id, id => id === categoryId(item.label))) ||
      !uniqueBy(categories, 'label') || !Array.isArray(questions) ||
      !questions.every(item => item && answered.has(item.questionId) && optional(item.score, score) &&
        optional(item.feedback, text) && optional(item.suggestedAnswer, text) && optional(item.howToImprove, text) &&
        optional(item.needsImprovement, value => typeof value === 'boolean')) ||
      !uniqueBy(questions, 'questionId') ||
      !optional(feedback, item => typeof item === 'object' && !Array.isArray(item) && optional(item.overall, text) &&
        ['strengths', 'improvements', 'recommendations'].every(field => optional(item[field], textList))) ||
      !optional(practiceFocus, value => validFocus(value, session.configuration))) return failed

  return {
    sessionId: session.id, status: 'completed', overallScore, performanceLevel, evaluatedAt,
    categories: categories.map(({ label, score }) => ({ id: categoryId(label), label, score })),
    questions, feedback, practiceFocus,
    ...(methodology ? { methodology: { id: methodology.id, version: methodology.version } } : {}),
    ...(response.source === 'fixture' ? { source: 'fixture' } : {})
  }
}

export function createInterviewEvaluationProvider(requestEvaluation) {
  return {
    async getEvaluation({ session, signal }) {
      if (!requestEvaluation) return { sessionId: session.id, status: 'unavailable' }
      try {
        const result = await requestEvaluation({ sessionId: session.id, session, signal })
        return validateInterviewEvaluation(result, session)
      } catch {
        return { sessionId: session.id, status: 'failed' }
      }
    }
  }
}

const fixturesEnabled = import.meta.env?.DEV && import.meta.env.VITE_INTERVIEW_EVALUATION_FIXTURES === '1'

export function readStoredInterviewEvaluation(response, session) {
  if (!response || (response.source === 'fixture' && !fixturesEnabled)) {
    return { sessionId: session.id, status: 'unavailable' }
  }
  return validateInterviewEvaluation(response, session)
}

export const interviewEvaluationProvider = createInterviewEvaluationProvider(
  fixturesEnabled
    ? async request => (await import('./interviewEvaluationFixtures.js')).requestEvaluationFixture(request)
    : undefined
)
