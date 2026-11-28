import assert from 'node:assert/strict'
import test from 'node:test'
import {
  aggregateSkills, buildProgressRecords, compareInterviews, filterProgress, performanceSummary,
  practiceActivity, progressDateRange, progressDefaults, scoreEvolution
} from '../src/services/interviewProgressModel.js'
import { createInterviewCoachingProvider } from '../src/services/interviewCoachingProvider.js'

// These synthetic inputs exercise pure calculations in Node. They are never written to browser storage.
const local = (year, month, day) => +new Date(year, month - 1, day, 12)
const rubric = { id: 'unit-test-rubric', version: '1' }
const testDay = day => local(2026, 5, day)

function sample(id, day, options = {}) {
  const {
    score = null, type = 'technical', difficulty = 'medium', role = 'Engineer',
    method = rubric, answers = ['One two three'], skipped = [], duration = 40000,
    reason = 'all-questions-completed', categories = [], status = 'completed',
    date = testDay(day)
  } = options
  const configuration = {
    interviewType: type, role, difficulty, questionCount: 5, durationMinutes: null,
    ...(type === 'technical' ? { skills: ['React'] } : { topics: ['Teamwork'] })
  }
  const session = {
    id, status, configuration, interviewType: type, createdAt: date, startedAt: date,
    elapsedMs: duration, runningSince: null, completedAt: status === 'completed' ? date + duration : null,
    completionReason: reason, answers: answers.map((text, index) => ({ text, questionId: `q${index}` })),
    skipped: skipped.map(questionId => ({ questionId }))
  }
  const evaluation = score === null ? { status: 'unavailable' } : {
    sessionId: id, status: 'completed', overallScore: score, performanceLevel: 'Synthetic test input',
    evaluatedAt: new Date(date + duration).toISOString(), ...(method ? { methodology: method } : {}),
    categories: categories.map(([label, value]) => ({ label, score: value })), questions: []
  }
  return { session, evaluation }
}

test('combined filters and equivalent previous local calendar periods', () => {
  const now = testDay(11)
  const filters = { ...progressDefaults, period: '7', type: 'technical', role: 'engineer', difficulty: 'hard' }
  const period = progressDateRange(filters, now)
  assert.equal(period.from, +new Date(2026, 4, 5))
  assert.equal(period.to, +new Date(2026, 4, 12))
  assert.deepEqual(period.previous, { from: +new Date(2026, 3, 28), to: +new Date(2026, 4, 5) })
  const records = buildProgressRecords([
    sample('before', 4, { difficulty: 'hard' }), sample('included', 5, { difficulty: 'hard', role: 'ENGINEER' }),
    sample('difficulty', 6), sample('type', 6, { type: 'general', difficulty: 'hard' }),
    sample('role', 11, { role: 'Analyst', difficulty: 'hard' }), sample('after', 12, { difficulty: 'hard' })
  ], now)
  assert.deepEqual(filterProgress(records, filters, period).map(record => record.session.id), ['included'])
  assert.deepEqual(filterProgress(records, filters, period.previous).map(record => record.session.id), ['before'])
})

test('inclusive custom dates, invalid dates, and clamped month or year boundaries', () => {
  const now = local(2024, 8, 31)
  const halfYear = progressDateRange({ ...progressDefaults, period: '6-months' }, now)
  assert.equal(halfYear.from, +new Date(2024, 1, 29))
  const year = progressDateRange({ ...progressDefaults, period: 'year' }, local(2024, 2, 29))
  assert.equal(year.from, +new Date(2023, 1, 28))
  const custom = { ...progressDefaults, period: 'custom', from: '2024-08-30', to: '2024-08-31' }
  assert.equal(progressDateRange(custom, now).to, +new Date(2024, 8, 1))
  assert.equal(progressDateRange({ ...custom, from: '2024-04-31' }, now).invalid, true)
  assert.equal(progressDateRange({ ...custom, to: '2024-08-01' }, now).invalid, true)
  assert.equal(progressDateRange({ ...custom, to: '' }, now).previous, undefined)
})

test('scores retain genuine zeros and omit missing, invalid, and unfinished evaluations', () => {
  const records = buildProgressRecords([
    sample('zero', 1, { score: 0 }), sample('missing', 2), sample('invalid', 3, { score: 101 }),
    sample('active', 4, { score: 75, status: 'active' }), sample('best', 5, { score: 80 })
  ])
  const overview = performanceSummary(records, [])
  assert.equal(overview.total, 5)
  assert.equal(overview.evaluated, 2)
  assert.equal(overview.average, 40)
  assert.equal(overview.best, 80)
  assert.equal(overview.trend, 80)
  assert.equal(overview.types.find(type => type.id === 'technical').latest, 80)
  assert.deepEqual(scoreEvolution(records).map(point => point.runningAverage), [0, null, null, null, 40])
  assert.equal(records.find(record => record.session.id === 'invalid').evaluationStatus, 'Failed')
})

test('period comparisons and trends require comparable evaluations', () => {
  const previous = buildProgressRecords([sample('prior', 1, { score: 50 })])
  const current = buildProgressRecords([sample('first', 4, { score: 60 }), sample('latest', 5, { score: 80 })])
  assert.equal(performanceSummary(current, previous).periodDelta, 20)
  assert.equal(performanceSummary(current, previous).trend, 20)
  const unknown = buildProgressRecords([sample('unknown', 6, { method: null, score: 100 })])
  assert.equal(performanceSummary([...current, ...unknown], previous).periodDelta, null)
  const changed = buildProgressRecords([sample('different', 6, { method: { ...rubric, version: '2' }, score: 95 })])
  assert.equal(performanceSummary([...current, ...changed], previous).trend, null)
  assert.equal(scoreEvolution([...current, ...changed])[1].runningAverage, null)
  const behavioral = buildProgressRecords([sample('behavioral', 6, { type: 'behavioral', score: 95 })])
  assert.equal(performanceSummary([...current, ...behavioral], []).bestType, 'Behavioral Interview')
})

test('category IDs, compatible category aggregation, and interview comparisons', () => {
  const [first, second, changed] = buildProgressRecords([
    sample('first', 1, { score: 50, categories: [['Communication', 40], ['Technical Knowledge', 70]] }),
    sample('second', 2, { score: 75, categories: [['Communication', 80]], answers: ['Two words', 'Third answer'] }),
    sample('changed', 3, { score: 90, method: { ...rubric, version: '2' }, categories: [['Communication', 100]] })
  ])
  const skills = aggregateSkills([first, second])
  assert.deepEqual(skills.find(skill => skill.id === 'communication'), {
    id: 'communication', label: 'Communication', score: 60, count: 2,
    method: JSON.stringify([rubric.id, rubric.version, 'provider']), change: 40
  })
  assert.equal(aggregateSkills([first, second, changed])[0].score, null)
  const comparable = compareInterviews(first, second)
  assert.deepEqual(comparable.warnings, [])
  assert.equal(comparable.rows.find(row => row.label === 'Overall score').b - first.score, 25)
  assert.equal(comparable.rows.find(row => row.label === 'Technical Knowledge').compare, false)
  assert.equal(comparable.rows.find(row => row.label === 'Completion rate').b, 40)
  const incompatible = compareInterviews(first, changed)
  assert.equal(incompatible.rows.find(row => row.label === 'Overall score').compare, false)
  assert.ok(incompatible.warnings.includes('Scoring methodologies differ.'))
  const invalid = sample('bad-category', 4, { score: 60, categories: [['Communication', 50]] })
  invalid.evaluation.categories[0].id = 'other'
  assert.equal(buildProgressRecords([invalid])[0].score, null)
})

test('activity groups by local day, Monday week, or month and only counts meaningful practice', () => {
  const now = testDay(12)
  const records = buildProgressRecords([
    sample('first', 7, { skipped: ['q2'] }), sample('second', 8), sample('third', 9, { reason: 'ended-early' }),
    sample('unanswered', 10, { answers: [], skipped: ['q1'] }),
    sample('yesterday', 11, { answers: ['Words here', 'Another answer'] }),
    sample('today', 12, { status: 'paused', reason: null })
  ], now)
  const daily = practiceActivity(records, 'day', now)
  assert.deepEqual(daily.buckets.map(bucket => new Date(bucket.date).getDate()), [7, 8, 9, 11, 12])
  assert.equal(daily.current, 2)
  assert.equal(daily.longest, 3)
  assert.equal(daily.completedThisWeek, 1)
  assert.deepEqual(practiceActivity(records, 'week', now).buckets.map(bucket => bucket.interviews), [3, 2])
  const [month] = practiceActivity(records, 'month', now).buckets
  assert.deepEqual([month.interviews, month.timeMs, month.answered, month.skipped], [5, 200000, 6, 1])
  assert.equal(practiceActivity(records, 'day', testDay(13)).current, 2)
  assert.equal(practiceActivity(records, 'day', testDay(14)).current, 0)
})

test('future coaching providers are asynchronous and unavailable by default', async () => {
  const localProvider = createInterviewCoachingProvider()
  assert.deepEqual(await localProvider.getInsights({}), { status: 'unavailable' })
  assert.deepEqual(await localProvider.getPracticePlan({}), { status: 'unavailable' })
  const request = { workspaceId: 'unit-test' }
  const adapter = createInterviewCoachingProvider({ requestInsights: async input => {
    assert.equal(input, request)
    return { status: 'pending' }
  } })
  assert.deepEqual(await adapter.getInsights(request), { status: 'pending' })
})
