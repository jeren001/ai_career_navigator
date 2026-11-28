import assert from 'node:assert/strict'
import test from 'node:test'
import { customInterviewConfig } from '../src/services/customInterviewConfig.js'
import { validateInterviewEvaluation } from '../src/services/interviewEvaluationProvider.js'
import { filterHistory, historyDateRange, historyDefaults, buildHistoryRecords } from '../src/services/interviewHistoryModel.js'
import { buildInterviewQuestionRequest, createInterviewQuestionProvider } from '../src/services/interviewQuestionProvider.js'
import { buildInterviewResults } from '../src/services/interviewResultsModel.js'
import {
  applySessionAction, assertCurrentSessionAction, createSession, expireSession, InterviewSessionConflictError,
  sessionTime, validSessionConfiguration, validStoredSession
} from '../src/services/interviewSessionModel.js'
import { createInterviewSetupConfig } from '../src/services/interviewSetupConfig.js'

const startTime = 1_000_000
const technical = {
  format: 'text', interviewType: 'technical', role: 'Engineer', experience: 'junior', skills: ['React'],
  difficulty: 'medium', questionCount: 5, durationMinutes: 15, language: 'en'
}
// Synthetic, in-memory test inputs. These providers and records are never stored or shipped.
const prompt = (id, extra = {}) => ({ id, category: 'Unit test only', content: '[test prompt]', source: 'provider', ...extra })
const initial = (configuration = technical) => createSession('test-session', configuration, startTime)
const deliver = (session, question, now = startTime) =>
  applySessionAction(session, { type: 'question', index: session.questionIndex, question }, now)

test('validates configuration and projects only selected Custom type fields', () => {
  assert.equal(validSessionConfiguration(technical), true)
  assert.equal(validSessionConfiguration({ ...technical, skills: [] }), false)
  assert.equal(validSessionConfiguration({ ...technical, format: 'video' }), false)
  assert.equal(validSessionConfiguration({ ...technical, durationMinutes: 5 }), false)
  const draft = {
    ...technical, companyName: '', jobDescription: '', instructions: '',
    role: 'Engineer', experience: 'junior',
    types: ['technical'], skills: ['React'], behavioralSkills: ['Teamwork'],
    questionBank: { questions: ['[authored test prompt]'], editor: { text: '', original: null } }
  }
  const configuration = customInterviewConfig.buildConfiguration(draft)
  assert.equal(validSessionConfiguration(configuration), true)
  assert.equal(Object.hasOwn(configuration, 'behavioralSkills'), false)
  assert.equal(validSessionConfiguration({ ...configuration, customQuestions: ['[one]', '[ONE]'] }), false)
})

test('setup drafts do not carry over when the local workspace changes', t => {
  let workspace = null
  const values = new Map()
  const previousLocal = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const previousSession = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => workspace } })
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: {
    getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value)
  } })
  t.after(() => {
    if (previousLocal) Object.defineProperty(globalThis, 'localStorage', previousLocal)
    else delete globalThis.localStorage
    if (previousSession) Object.defineProperty(globalThis, 'sessionStorage', previousSession)
    else delete globalThis.sessionStorage
  })
  const config = createInterviewSetupConfig({ interviewType: 'technical', focusField: 'skills', focusError: 'Add a skill.' })
  config.saveDraft({ ...technical, role: 'Private original role' })
  workspace = 'another-workspace'
  assert.equal(config.readDraft().role, '')
  config.saveDraft({ ...technical, role: 'Second workspace role' })
  assert.equal(config.readDraft().role, 'Second workspace role')
  workspace = null
  assert.equal(config.readDraft().role, 'Private original role')
})

test('waiting, pause, resume and clock recovery preserve elapsed time and unfinished text', () => {
  const waiting = initial()
  assert.deepEqual(sessionTime(waiting, startTime + 10000), { elapsedMs: 0, remainingMs: 900000 })
  let session = deliver(waiting, prompt('q1'), startTime + 10000)
  session = applySessionAction(session, { type: 'draft', questionId: 'q1', text: 'Unfinished\nanswer' }, startTime + 30000)
  session = applySessionAction(session, { type: 'pause', questionId: 'q1' }, startTime + 40000)
  assert.deepEqual(sessionTime(session, startTime + 150000), { elapsedMs: 30000, remainingMs: 870000 })
  session = applySessionAction(session, { type: 'resume' }, startTime + 150000)
  const recovered = expireSession(session, startTime + 1_100_000)
  assert.equal(recovered.completionReason, 'time-expired')
  assert.equal(recovered.completedAt, startTime + 1_020_000)
  assert.equal(recovered.unfinishedAnswers.q1, 'Unfinished\nanswer')
  assert.equal(validStoredSession(recovered, recovered.id), true)
  assert.equal(validStoredSession({ ...recovered, remainingMs: 1 }, recovered.id), false)
  const unlimited = deliver(initial({ ...technical, durationMinutes: null }), prompt('q1'))
  assert.deepEqual(sessionTime(unlimited, startTime + 2000000), { elapsedMs: 2000000, remainingMs: null })
  assert.equal(expireSession(unlimited, startTime + 2000000), unlimited)
})

test('stale tab actions cannot overwrite or advance a handled question', () => {
  let session = deliver(initial(), prompt('q1'))
  const answer = { type: 'answer', questionId: 'q1', text: '  Exact text\nSecond line.  ' }
  assert.doesNotThrow(() => assertCurrentSessionAction(session, answer))
  session = applySessionAction(session, answer, startTime + 100)
  session = deliver(session, prompt('q2'), startTime + 200)
  for (const type of ['answer', 'draft', 'skip', 'pause', 'end', 'expire']) {
    assert.throws(() => assertCurrentSessionAction(session, { type, questionId: 'q1' }), InterviewSessionConflictError)
  }
  assert.equal(session.answers[0].text, answer.text)
  assert.equal(session.questionIndex, 1)
  assert.equal(session.questions[1].id, 'q2')
})

test('adaptive provider uses exact submitted answers, stable retry keys and valid follow-ups', async () => {
  let session = deliver(initial(), prompt('q1'))
  session = applySessionAction(session, { type: 'answer', questionId: 'q1', text: 'Answered\nline two' }, startTime + 1)
  session = deliver(session, prompt('q2'), startTime + 2)
  session = applySessionAction(session, { type: 'skip', questionId: 'q2', text: 'Private draft' }, startTime + 3)
  const request = buildInterviewQuestionRequest(session)
  assert.equal(request.requestKey, buildInterviewQuestionRequest(session).requestKey)
  assert.deepEqual(request.history.map(({ outcome, answer }) => [outcome, answer]),
    [['answered', 'Answered\nline two'], ['skipped', undefined]])
  assert.equal(JSON.stringify(request).includes('Private draft'), false)
  const adapter = createInterviewQuestionProvider(async input => ({
    status: 'available',
    question: prompt('q3', { followUpTo: input.history.find(item => item.outcome === 'answered').question.id })
  }))
  const response = await adapter.getQuestion(request)
  assert.throws(() => deliver(session, prompt('invalid', { followUpTo: 'q2' })), /invalid question/)
  assert.throws(() => deliver(session, prompt('q1')), /invalid question/)
  assert.equal(deliver(session, response.question).questions[2].followUpTo, 'q1')
  assert.deepEqual(await createInterviewQuestionProvider().getQuestion(request), { status: 'unavailable' })
  assert.equal((await createInterviewQuestionProvider().getQuestion({
    ...request, index: 0, configuration: { ...technical, customQuestions: ['[authored test prompt]'] }
  })).question.source, 'custom')
  const abort = new AbortController()
  const cancelled = createInterviewQuestionProvider(async () => {
    abort.abort()
    return { status: 'pending' }
  })
  await assert.rejects(cancelled.getQuestion({ ...request, signal: abort.signal }), { name: 'AbortError' })
})

test('results and history distinguish submitted, skipped, unfinished and undelivered questions', () => {
  let session = deliver(initial(), prompt('q1'))
  session = applySessionAction(session, { type: 'answer', questionId: 'q1', text: 'Three words here\n' }, startTime + 1)
  session = deliver(session, prompt('q2'), startTime + 2)
  session = applySessionAction(session, { type: 'skip', questionId: 'q2', text: 'Skipped draft' }, startTime + 3)
  session = deliver(session, prompt('q3'), startTime + 4)
  session = applySessionAction(session, { type: 'end', questionId: 'q3', text: 'Unfinished draft' }, startTime + 5)
  const result = buildInterviewResults(session)
  assert.deepEqual(result.review.map(item => item.status), ['Answered', 'Skipped', 'Unfinished'])
  assert.equal(result.undelivered, 2)
  assert.equal(Object.fromEntries(result.stats)['Completion rate'], '20%')
  assert.equal(Object.fromEntries(result.stats)['Total words written'], 3)
  const saved = buildHistoryRecords([{ session, evaluation: { status: 'unavailable' } }], startTime + 10)
  const filters = { ...historyDefaults, search: 'ENGINEER react', type: 'technical', status: 'Ended Early' }
  assert.equal(filterHistory(saved, filters, historyDateRange(filters)).length, 1)
  assert.equal(filterHistory(saved, { ...filters, status: 'Completed' }, historyDateRange(filters)).length, 0)
  const response = {
    sessionId: session.id, status: 'completed', evaluatedAt: new Date(startTime + 5).toISOString(),
    overallScore: 90, performanceLevel: 'Unit test only', questions: [{ questionId: 'q2', score: 80 }], categories: []
  }
  assert.equal(validateInterviewEvaluation(response, session).status, 'failed')
  assert.equal(validateInterviewEvaluation({ ...response, questions: [{ questionId: 'q1', score: 80 }] }, session).status, 'completed')
})
