import { entryKey, validateInterviewSettings } from './interviewSetupConfig.js'
import { customInterviewTypes } from './customInterviewConfig.js'

export const interviewTypeLabels = {
  technical: 'Technical Interview',
  behavioral: 'Behavioral Interview',
  general: 'General Interview',
  custom: 'Custom Interview'
}

export const completionLabels = {
  'all-questions-completed': 'All questions completed',
  'time-expired': 'Time expired',
  'ended-early': 'Interview ended early'
}

function hasEntries(entries) {
  return Array.isArray(entries) && entries.length > 0 &&
    entries.every(entry => typeof entry === 'string' && entry.trim())
}

export function validSessionConfiguration(config) {
  if (!config || typeof config.role !== 'string' || config.format !== 'text' ||
      !Object.hasOwn(interviewTypeLabels, config.interviewType) ||
      Object.keys(validateInterviewSettings(config)).length) return false

  if (config.interviewType !== 'custom') {
    return hasEntries(config.interviewType === 'technical' ? config.skills : config.topics)
  }

  const { types, customQuestions } = config
  return hasEntries(types) && new Set(types).size === types.length && types.every(id => {
    const type = customInterviewTypes.find(item => item.id === id)
    return type && hasEntries(config[type.field])
  }) && ['companyName', 'jobDescription', 'instructions'].every(field => typeof config[field] === 'string') &&
    Array.isArray(customQuestions) && customQuestions.length <= config.questionCount &&
    (!customQuestions.length || hasEntries(customQuestions) &&
      new Set(customQuestions.map(entryKey)).size === customQuestions.length)
}

function limitMs(configuration) {
  return configuration.durationMinutes === null ? null : configuration.durationMinutes * 60000
}

export function createSession(id, configuration, now) {
  return {
    version: 1,
    id,
    interviewType: configuration.interviewType,
    configuration,
    questions: [],
    questionIndex: 0,
    answers: [],
    skipped: [],
    unfinishedAnswers: {},
    status: 'waiting',
    createdAt: now,
    startedAt: null,
    completedAt: null,
    pausedAt: null,
    runningSince: null,
    elapsedMs: 0,
    remainingMs: limitMs(configuration),
    completionReason: null
  }
}

export function validQuestion(question) {
  return Boolean(question && typeof question.id === 'string' && question.id.trim() &&
    typeof question.category === 'string' && question.category.trim() &&
    typeof question.content === 'string' && question.content.trim() &&
    ['custom', 'provider', 'fixture'].includes(question.source) &&
    (question.followUpTo === undefined ||
      (typeof question.followUpTo === 'string' && question.followUpTo.trim())))
}

const timestamp = value => Number.isSafeInteger(value) && value >= 0 && value <= 8.64e15
const optionalTimestamp = value => value === null || timestamp(value)

export function validStoredSession(session, id) {
  if (!session || !id || session.version !== 1 || session.id !== id ||
      !validSessionConfiguration(session.configuration) ||
      session.interviewType !== session.configuration.interviewType ||
      !['waiting', 'active', 'paused', 'completed'].includes(session.status) ||
      !timestamp(session.createdAt) || !timestamp(session.elapsedMs) ||
      !['startedAt', 'completedAt', 'pausedAt', 'runningSince', 'remainingMs'].every(key => optionalTimestamp(session[key])) ||
      !Array.isArray(session.questions) || !session.questions.every(validQuestion) ||
      !Array.isArray(session.answers) || !Array.isArray(session.skipped) ||
      !session.unfinishedAnswers || typeof session.unfinishedAnswers !== 'object' ||
      Array.isArray(session.unfinishedAnswers) ||
      !Number.isInteger(session.questionIndex) || session.questionIndex < 0 ||
      session.questionIndex > session.configuration.questionCount ||
      session.questions.length < session.questionIndex || session.questions.length > session.questionIndex + 1 ||
      session.questions.length > session.configuration.questionCount) return false

  const questionIds = session.questions.map(question => question.id)
  const handledIds = [...session.answers, ...session.skipped].map(item => item?.questionId)
  const currentTiming = sessionTime(session, session.runningSince ?? session.createdAt)
  const answeredIds = new Set(session.answers.map(item => item?.questionId))
  return new Set(questionIds).size === questionIds.length &&
    currentTiming.elapsedMs === session.elapsedMs && currentTiming.remainingMs === session.remainingMs &&
    (session.status !== 'waiting' || (session.startedAt === null && session.questions.length === 0)) &&
    (session.completionReason !== 'all-questions-completed' || session.questionIndex === session.configuration.questionCount) &&
    (session.completionReason !== 'time-expired' || session.remainingMs === 0) &&
    handledIds.length === session.questionIndex && new Set(handledIds).size === handledIds.length &&
    handledIds.every(questionId => questionIds.slice(0, session.questionIndex).includes(questionId)) &&
    session.questions.every((question, index) => question.followUpTo === undefined ||
      (answeredIds.has(question.followUpTo) && questionIds.indexOf(question.followUpTo) < index)) &&
    session.answers.every(item => typeof item.text === 'string' && item.text.trim() && timestamp(item.submittedAt)) &&
    session.skipped.every(item => timestamp(item.skippedAt)) &&
    Object.entries(session.unfinishedAnswers).every(([questionId, text]) => questionIds.includes(questionId) && typeof text === 'string') &&
    (session.status === 'active' ? session.runningSince !== null && session.startedAt !== null : session.runningSince === null) &&
    (session.status === 'paused' ? session.pausedAt !== null && session.startedAt !== null : session.pausedAt === null) &&
    (session.status === 'completed'
      ? session.completedAt !== null && Object.hasOwn(completionLabels, session.completionReason)
      : session.completedAt === null && session.completionReason === null &&
        session.questionIndex < session.configuration.questionCount)
}

export function sessionTime(session, now) {
  const limit = limitMs(session.configuration)
  const since = session.runningSince
  const elapsed = session.elapsedMs + (since === null ? 0 : Math.max(0, now - since))
  return {
    elapsedMs: limit === null ? elapsed : Math.min(limit, elapsed),
    remainingMs: limit === null ? null : Math.max(0, limit - elapsed)
  }
}

function checkpoint(session, now) {
  return {
    ...session,
    ...sessionTime(session, now),
    runningSince: session.runningSince === null ? null : Math.max(session.runningSince, now)
  }
}

function complete(session, now, completionReason) {
  return {
    ...checkpoint(session, now),
    status: 'completed',
    runningSince: null,
    pausedAt: null,
    completedAt: now,
    completionReason
  }
}

export function expireSession(session, now) {
  if (session.status !== 'active' || sessionTime(session, now).remainingMs !== 0) return session
  const endsAt = session.runningSince + Math.max(0, limitMs(session.configuration) - session.elapsedMs)
  return complete(session, endsAt, 'time-expired')
}

function captureDraft(session, action) {
  const question = session.questions[session.questionIndex]
  if (!question || action.questionId !== question.id || typeof action.text !== 'string') return session
  const unfinishedAnswers = { ...session.unfinishedAnswers }
  if (action.text.length) return { ...session, unfinishedAnswers: { ...unfinishedAnswers, [question.id]: action.text } }
  delete unfinishedAnswers[question.id]
  return { ...session, unfinishedAnswers }
}

export class InterviewSessionConflictError extends Error {
  constructor() {
    super('This interview changed in another tab. Your text is still here. Copy it before reopening the interview.')
    this.name = 'InterviewSessionConflictError'
  }
}

export function assertCurrentSessionAction(session, action) {
  if (!['draft', 'answer', 'skip', 'pause', 'end', 'expire'].includes(action.type)) return
  const questionId = session.questions[session.questionIndex]?.id
  const requiresActive = ['draft', 'answer', 'skip', 'pause', 'expire'].includes(action.type)
  if (questionId !== action.questionId || session.status === 'completed' ||
      (requiresActive && session.status !== 'active') ||
      (['draft', 'answer', 'skip'].includes(action.type) && !questionId)) {
    throw new InterviewSessionConflictError()
  }
}

export function applySessionAction(session, action, now) {
  const timed = session.status === 'active' && sessionTime(session, now).remainingMs === 0
  const current = expireSession(timed ? captureDraft(session, action) : session, now)
  if (current.status === 'completed') return current
  const question = current.questions[current.questionIndex]

  switch (action.type) {
    case 'question': {
      if (action.index !== current.questionIndex || question || current.status === 'paused') return current
      if (!validQuestion(action.question) || current.questions.some(item => item.id === action.question.id) ||
          (action.question.followUpTo !== undefined &&
            !current.answers.some(answer => answer.questionId === action.question.followUpTo))) {
        throw new Error('The question provider returned an invalid question.')
      }
      const updated = checkpoint(current, now)
      return {
        ...updated,
        questions: [...current.questions, action.question],
        status: 'active',
        startedAt: current.startedAt ?? now,
        runningSince: updated.runningSince ?? now
      }
    }
    case 'draft':
      return current.status === 'active' && question?.id === action.questionId
        ? checkpoint(captureDraft(current, action), now)
        : current
    case 'answer':
    case 'skip': {
      if (current.status !== 'active' || !question || question.id !== action.questionId) return current
      if (action.type === 'answer' && (typeof action.text !== 'string' || !action.text.trim())) {
        throw new Error('Enter an answer before submitting.')
      }
      const updated = checkpoint(captureDraft(current, action), now)
      if (action.type === 'answer') {
        delete updated.unfinishedAnswers[question.id]
        updated.answers = [...updated.answers, { questionId: question.id, text: action.text, submittedAt: now }]
      } else {
        updated.skipped = [...updated.skipped, { questionId: question.id, skippedAt: now }]
      }
      updated.questionIndex++
      return updated.questionIndex === updated.configuration.questionCount
        ? complete(updated, now, 'all-questions-completed')
        : updated
    }
    case 'pause':
      return current.status === 'active'
        ? { ...checkpoint(captureDraft(current, action), now), status: 'paused', pausedAt: now, runningSince: null }
        : current
    case 'resume':
      return current.status === 'paused'
        ? { ...current, status: 'active', pausedAt: null, runningSince: now }
        : current
    case 'end':
      return complete(captureDraft(current, action), now, 'ended-early')
    default:
      return current
  }
}
