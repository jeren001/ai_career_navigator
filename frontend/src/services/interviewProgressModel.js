import { validateInterviewEvaluation } from './interviewEvaluationProvider.js'
import { buildHistoryRecords, historyDateRange } from './interviewHistoryModel.js'
import { countAnswerWords } from './interviewResultsModel.js'
import { interviewTypeLabels } from './interviewSessionModel.js'
import { entryKey } from './interviewSetupConfig.js'

export const progressDefaults = { period: 'all', from: '', to: '', type: 'all', role: '', difficulty: 'all' }
const dayMs = 86400000
const average = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const plusDays = (date, count) => {
  const result = new Date(date)
  result.setDate(result.getDate() + count)
  return result
}
const localDay = timestamp => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date
}
const dayNumber = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / dayMs

export function progressDateRange(filters, now = Date.now()) {
  let range
  if (['6-months', 'year'].includes(filters.period)) {
    const today = localDay(now)
    const from = new Date(today)
    const day = from.getDate()
    from.setDate(1)
    from.setMonth(from.getMonth() - (filters.period === 'year' ? 12 : 6))
    from.setDate(Math.min(day, new Date(from.getFullYear(), from.getMonth() + 1, 0).getDate()))
    range = { from: +from, to: +plusDays(today, 1) }
  } else {
    range = historyDateRange(filters, now)
  }
  if (!Number.isFinite(range.from) || !Number.isFinite(range.to)) return range
  const length = dayNumber(new Date(range.to)) - dayNumber(new Date(range.from))
  return { ...range, previous: { from: +plusDays(new Date(range.from), -length), to: range.from } }
}

export function buildProgressRecords(stored, now = Date.now()) {
  return buildHistoryRecords(stored, now).map(record => {
    const { session } = record
    const evaluation = session.status === 'completed' && record.evaluation?.status === 'completed'
      ? validateInterviewEvaluation(record.evaluation, session)
      : null
    return {
      ...record,
      score: evaluation?.status === 'completed' ? evaluation.overallScore : null,
      evaluationStatus: evaluation?.status === 'failed' ? 'Failed' : record.evaluationStatus,
      evaluation: evaluation?.status === 'completed' ? evaluation : null
    }
  }).sort((a, b) => a.date - b.date || a.session.createdAt - b.session.createdAt || a.session.id.localeCompare(b.session.id))
}

export function filterProgress(records, filters, range) {
  if (range.invalid) return []
  return records.filter(({ session, date }) => date >= range.from && date < range.to &&
    (filters.type === 'all' || filters.type === session.interviewType) &&
    (!filters.role || filters.role === entryKey(session.configuration.role)) &&
    (filters.difficulty === 'all' || filters.difficulty === session.configuration.difficulty))
}

function methodologyKey(record) {
  const methodology = record.evaluation?.methodology
  return methodology ? JSON.stringify([methodology.id, methodology.version, record.evaluation.source ?? 'provider']) : null
}

function typeShape(record) {
  const { configuration } = record.session
  return JSON.stringify([record.session.interviewType, ...(configuration.types ?? []).slice().sort()])
}

function comparabilityKey(record) {
  const methodology = methodologyKey(record)
  return methodology ? JSON.stringify([typeShape(record), record.session.configuration.difficulty, methodology]) : null
}

function scored(records) {
  return records.filter(record => record.score !== null)
}

function compatible(records) {
  if (!records.length) return false
  const key = comparabilityKey(records[0])
  return Boolean(key && records.every(record => comparabilityKey(record) === key))
}

function scoreSummary(records) {
  const evaluations = scored(records)
  const scores = evaluations.map(record => record.score)
  const recent = evaluations[evaluations.length - 1]
  return {
    total: records.length,
    evaluated: scores.length,
    average: average(scores),
    best: scores.length ? scores.reduce((max, score) => Math.max(max, score), 0) : null,
    latest: recent?.score ?? null,
    timeMs: records.reduce((total, record) => total + record.elapsedMs, 0),
    trend: evaluations.length >= 2 && compatible(evaluations) ? recent.score - evaluations[0].score : null
  }
}

export function scoreEvolution(records) {
  const evaluations = scored(records)
  const showAverage = evaluations.length >= 2 && compatible(evaluations)
  let sum = 0
  let count = 0
  return records.map(record => {
    if (record.score !== null) {
      sum += record.score
      count++
    }
    return {
      record, cohort: record.score === null ? null : comparabilityKey(record),
      runningAverage: showAverage && record.score !== null ? sum / count : null
    }
  })
}

export function performanceSummary(records, previous) {
  const summary = scoreSummary(records)
  const types = Object.entries(interviewTypeLabels).map(([id, label]) => ({
    id, label, ...scoreSummary(records.filter(record => record.session.interviewType === id))
  }))
  const currentScores = scored(records)
  const previousScores = scored(previous)
  const validPeriod = currentScores.length > 0 && previousScores.length > 0 &&
    compatible([...currentScores, ...previousScores])
  const ratedTypes = types.filter(item => item.evaluated > 0).sort((a, b) => b.average - a.average)
  const comparableTypes = ratedTypes.length >= 2 && new Set(currentScores.map(methodologyKey)).size === 1 &&
    Boolean(methodologyKey(currentScores[0])) &&
    new Set(currentScores.map(record => record.session.configuration.difficulty)).size === 1
  return {
    ...summary, types,
    previousAverage: validPeriod ? average(previousScores.map(record => record.score)) : null,
    periodDelta: validPeriod ? summary.average - average(previousScores.map(record => record.score)) : null,
    bestType: comparableTypes && ratedTypes[0].average > ratedTypes[1].average ? ratedTypes[0].label : null
  }
}

export function aggregateSkills(records) {
  const groups = new Map()
  for (const record of scored(records)) {
    for (const category of record.evaluation.categories) {
      const items = groups.get(category.id) ?? []
      items.push({ record, category })
      groups.set(category.id, items)
    }
  }
  return [...groups.values()].map(items => {
    const methods = new Set(items.map(item => methodologyKey(item.record)))
    const method = methods.size === 1 ? [...methods][0] : null
    const combined = items.length === 1 || Boolean(method)
    const scores = items.map(item => item.category.score)
    const comparable = items.length >= 2 && compatible(items.map(item => item.record))
    return {
      id: items[0].category.id, label: items[0].category.label,
      score: combined ? average(scores) : null, count: items.length, method,
      change: comparable ? scores[scores.length - 1] - scores[0] : null
    }
  }).sort((a, b) => a.label.localeCompare(b.label))
}

function weekStart(day) {
  return plusDays(day, -((day.getDay() + 6) % 7))
}

export function practiceActivity(records, period, now = Date.now()) {
  const groups = new Map()
  const days = new Set()
  const today = localDay(now)
  const week = weekStart(today)
  let completedThisWeek = 0
  for (const record of records) {
    const { session } = record
    if (!session.answers.length) continue
    const day = localDay(record.date)
    days.add(dayNumber(day))
    const date = period === 'week' ? weekStart(day) : period === 'month'
      ? new Date(day.getFullYear(), day.getMonth(), 1) : day
    const key = +date
    const bucket = groups.get(key) ?? { date: key, interviews: 0, timeMs: 0, answered: 0, skipped: 0 }
    bucket.interviews++
    bucket.timeMs += record.elapsedMs
    bucket.answered += session.answers.length
    bucket.skipped += session.skipped.length
    groups.set(key, bucket)
    if (session.completionReason === 'all-questions-completed' && session.completedAt >= +week &&
        session.completedAt < +plusDays(week, 7)) completedThisWeek++
  }
  let longest = 0
  let run = 0
  let previous
  for (const day of [...days].sort((a, b) => a - b)) {
    run = day === previous + 1 ? run + 1 : 1
    longest = Math.max(longest, run)
    previous = day
  }
  let current = 0
  let day = dayNumber(today)
  if (!days.has(day)) day--
  while (days.has(day--)) current++
  return { buckets: [...groups.values()].sort((a, b) => a.date - b.date), current, longest, completedThisWeek }
}

export function comparisonWarnings(a, b) {
  const warnings = []
  if (typeShape(a) !== typeShape(b)) warnings.push('Interview types or Custom interview mixes differ.')
  if (a.session.configuration.difficulty !== b.session.configuration.difficulty) warnings.push('Difficulty levels differ.')
  if (a.score === null || b.score === null) warnings.push('A validated evaluation is unavailable for one or both interviews.')
  else if (!methodologyKey(a) || !methodologyKey(b)) warnings.push('A scoring methodology is unavailable for one or both interviews.')
  else if (methodologyKey(a) !== methodologyKey(b)) warnings.push('Scoring methodologies differ.')
  return warnings
}

export function compareInterviews(a, b) {
  const metrics = record => {
    const answers = record.session.answers
    return {
      answers: answers.length,
      completion: answers.length * 100 / record.session.configuration.questionCount,
      time: record.elapsedMs,
      words: average(answers.map(answer => countAnswerWords(answer.text)))
    }
  }
  const warnings = comparisonWarnings(a, b)
  const comparable = warnings.length === 0
  const first = metrics(a)
  const second = metrics(b)
  const rows = [
    { label: 'Overall score', a: a.score, b: b.score, unit: 'score', compare: comparable },
    { label: 'Questions answered', a: first.answers, b: second.answers, unit: 'count', compare: true },
    { label: 'Completion rate', a: first.completion, b: second.completion, unit: 'score', compare: true },
    { label: 'Time spent', a: first.time, b: second.time, unit: 'time', compare: true },
    { label: 'Average answer length', a: first.words, b: second.words, unit: 'words', compare: true }
  ]
  const categoriesA = new Map(a.evaluation?.categories.map(category => [category.id, category]))
  const categoriesB = new Map(b.evaluation?.categories.map(category => [category.id, category]))
  const categories = new Map([...categoriesA, ...categoriesB])
  for (const [id, category] of categories) {
    rows.push({
      label: category.label, a: categoriesA.get(id)?.score ?? null, b: categoriesB.get(id)?.score ?? null,
      unit: 'score', compare: comparable && categoriesA.has(id) && categoriesB.has(id)
    })
  }
  return { warnings, rows }
}
