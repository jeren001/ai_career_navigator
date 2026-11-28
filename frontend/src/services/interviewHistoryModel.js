import { customInterviewTypes } from './customInterviewConfig.js'
import { formatInterviewDuration } from './interviewResultsModel.js'
import { interviewTypeLabels, sessionTime } from './interviewSessionModel.js'

export const historyDefaults = {
  search: '', type: 'all', status: 'all', period: 'all', evaluation: 'all', from: '', to: '', sort: 'newest'
}

const completedStatuses = {
  'all-questions-completed': 'Completed',
  'ended-early': 'Ended Early',
  'time-expired': 'Time Expired'
}

export function buildHistoryRecords(records, now = Date.now()) {
  return records.map(({ session, evaluation }) => {
    const { configuration } = session
    const status = session.status === 'completed' ? completedStatuses[session.completionReason]
      : session.status === 'paused' ? 'Paused' : 'In Progress'
    const score = session.status === 'completed' && evaluation?.status === 'completed' ? evaluation.overallScore : null
    const evaluationStatus = score !== null ? 'Evaluated'
      : ['pending', 'processing'].includes(evaluation?.status) ? 'Pending'
        : evaluation?.status === 'failed' ? 'Failed' : 'Unavailable'
    const fields = configuration.interviewType === 'custom'
      ? customInterviewTypes.filter(type => configuration.types.includes(type.id))
        .flatMap(type => [interviewTypeLabels[type.id], ...configuration[type.field]])
      : configuration.skills ?? configuration.topics
    const search = [configuration.role, configuration.companyName, interviewTypeLabels[configuration.interviewType], ...fields]
      .filter(Boolean).join(' ').normalize('NFKC').toLowerCase()
    return { session, evaluation, score, evaluationStatus, status, search, date: session.startedAt ?? session.createdAt,
      elapsedMs: sessionTime(session, now).elapsedMs }
  })
}

export function historyStatistics(records) {
  const scores = records.filter(record => record.score !== null).map(record => record.score)
  const average = scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length * 10) / 10 : null
  return [
    ['Total Interviews', records.length],
    ['Completed Interviews', records.filter(record => record.session.status === 'completed').length],
    ['Average Score', average === null ? 'Unavailable' : `${average}%`],
    ['Total Practice Time', formatInterviewDuration(records.reduce((sum, record) => sum + record.elapsedMs, 0))]
  ]
}

export function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function historyDateRange(filters, now = Date.now()) {
  if (filters.period === 'custom') {
    const from = parseLocalDate(filters.from)
    const to = parseLocalDate(filters.to)
    if ((filters.from && !from) || (filters.to && !to) || (from && to && from > to)) return { invalid: true }
    if (to) to.setDate(to.getDate() + 1)
    return { from: from?.getTime() ?? -Infinity, to: to?.getTime() ?? Infinity }
  }
  if (filters.period === 'all') return { from: -Infinity, to: Infinity }
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - (Number(filters.period) - 1))
  today.setDate(today.getDate() + 1)
  return { from: start.getTime(), to: today.getTime() }
}

export function filterHistory(records, filters, range) {
  if (range.invalid) return []
  const search = filters.search.trim().normalize('NFKC').toLowerCase().split(/\s+/u).filter(Boolean)
  const filtered = records.filter(record => search.every(term => record.search.includes(term)) &&
    (filters.type === 'all' || record.session.interviewType === filters.type) &&
    (filters.status === 'all' || record.status === filters.status) &&
    (filters.evaluation === 'all' || record.evaluationStatus === filters.evaluation) &&
    record.date >= range.from && record.date < range.to)
  const newest = (a, b) => b.date - a.date || b.session.createdAt - a.session.createdAt || b.session.id.localeCompare(a.session.id)
  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'oldest': return newest(b, a)
      case 'longest': return b.elapsedMs - a.elapsedMs || newest(a, b)
      case 'shortest': return a.elapsedMs - b.elapsedMs || newest(a, b)
      case 'highest':
      case 'lowest':
        if (a.score === null || b.score === null) return Number(a.score === null) - Number(b.score === null) || newest(a, b)
        return (filters.sort === 'highest' ? b.score - a.score : a.score - b.score) || newest(a, b)
      default: return newest(a, b)
    }
  })
}
