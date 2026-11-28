import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import InterviewHeader from '../components/interview-simulator/InterviewHeader'
import useInterviewRecords from '../components/interview-simulator/history/useInterviewRecords'
import ProgressFilters from '../components/interview-simulator/progress/ProgressFilters'
import { PerformanceEvolution, SkillsPerformance } from '../components/interview-simulator/progress/PerformanceCharts'
import PracticeActivity from '../components/interview-simulator/progress/PracticeActivity'
import InterviewComparison from '../components/interview-simulator/progress/InterviewComparison'
import ProgressCoaching from '../components/interview-simulator/progress/ProgressCoaching'
import { deltaText, scoreText } from '../components/interview-simulator/progress/progressFormat'
import ResultsFacts from '../components/interview-simulator/results/ResultsFacts'
import {
  aggregateSkills, buildProgressRecords, filterProgress, performanceSummary, progressDateRange, progressDefaults, scoreEvolution
} from '../services/interviewProgressModel'
import { formatInterviewDuration } from '../services/interviewResultsModel'
import { entryKey } from '../services/interviewSetupConfig'
import '../styles/interview-simulator.css'
import '../styles/interview-progress.css'

const home = '/interview-simulator'
const history = `${home}/history`

function PerformanceOverview({ summary, hasPrevious }) {
  return (
    <section className="progress-panel" aria-labelledby="progress-overview">
      <h3 id="progress-overview">Performance Overview</h3>
      <ResultsFacts className="progress-stat-cards" entries={[
        ['Average Score', scoreText(summary.average)], ['Best Score', scoreText(summary.best)],
        ['Total Interviews', summary.total], ['Total Practice Time', formatInterviewDuration(summary.timeMs)]
      ]} />
      <ResultsFacts className="progress-facts" entries={[
        ['Score change', deltaText(summary.trend)],
        ['Best-performing interview type', summary.bestType ?? 'Unavailable'],
        ['Previous period average', scoreText(summary.previousAverage)],
        ['Change from previous period', deltaText(summary.periodDelta)]
      ]} />
      {summary.trend === null && <p className="progress-note">Score change requires at least two comparable evaluations.</p>}
      {summary.periodDelta === null && <p className="progress-note">
        {hasPrevious ? 'Comparable evaluations are required in both periods.' : 'Select a bounded date range to compare with the previous equivalent period.'}
      </p>}
    </section>
  )
}

function PerformanceByType({ types }) {
  return (
    <section className="progress-panel" aria-labelledby="progress-by-type">
      <h3 id="progress-by-type">Performance by Interview Type</h3>
      <div className="progress-type-grid">
        {types.map(type => (
          <article key={type.id} className="progress-type">
            <h4>{type.label}</h4>
            {type.average !== null && <progress max={100} value={type.average} aria-label={`${type.label} average score`} />}
            <ResultsFacts className="progress-facts" entries={[
              ['Total interviews', type.total], ['Evaluated interviews', type.evaluated],
              ['Average score', scoreText(type.average)], ['Best score', scoreText(type.best)],
              ['Most recent score', scoreText(type.latest)], ['Total practice time', formatInterviewDuration(type.timeMs)],
              ['Score change', deltaText(type.trend)]
            ]} />
          </article>
        ))}
      </div>
    </section>
  )
}

function ProgressContent({ source }) {
  const [filters, setFilters] = useState(progressDefaults)
  const title = useRef(null)
  const { all, roles, range, records, completed, summary, points, skills, now } = useMemo(() => {
    const now = source.loadedAt
    const all = buildProgressRecords(source.records, now)
    const roles = new Map()
    for (const { session } of [...all].reverse()) {
      const role = session.configuration.role
      if (!roles.has(entryKey(role))) roles.set(entryKey(role), role)
    }
    const range = progressDateRange(filters, now)
    const records = filterProgress(all, filters, range)
    const previous = range.previous ? filterProgress(all, filters, range.previous) : []
    const completed = records.filter(record => record.session.status === 'completed')
    return {
      all, roles, range, records, completed, now, summary: performanceSummary(records, previous),
      points: scoreEvolution(completed), skills: aggregateSkills(completed)
    }
  }, [filters, source.loadedAt, source.records])

  useEffect(() => {
    window.scrollTo(0, 0)
    title.current.focus({ preventScroll: true })
  }, [])

  return (
    <main className="interview-progress-page">
      <nav className="progress-breadcrumb" aria-label="Breadcrumb">
        <Link to={home}><ArrowLeft size={17} aria-hidden="true" /> Back to Interview Simulator</Link>
        <span aria-current="page">Progress &amp; Performance</span>
      </nav>
      <div className="progress-toolbar">
        <h2 ref={title} tabIndex={-1}>Progress &amp; Performance</h2>
        <Link className="interview-secondary" to={history}>View Interview History</Link>
      </div>
      {source.loading ? <p role="status">Loading interview analytics…</p>
        : source.error ? (
          <section className="progress-panel">
            <p role="alert">Interview analytics could not be loaded. Check that browser storage is available and retry.</p>
            <button type="button" className="interview-secondary" onClick={source.retry}>Retry</button>
          </section>
        ) : (
          <>
            {all.length > 0 && (
              <ProgressFilters filters={filters} range={range} count={records.length}
                roles={[...roles].sort((a, b) => a[1].localeCompare(b[1]))}
                onChange={(field, value) => setFilters(previous => ({ ...previous, [field]: value }))}
                onClear={() => setFilters(progressDefaults)} />
            )}
            {all.length === 0 ? (
              <section className="progress-panel">
                <h3>No interview history</h3>
                <p>Start an interview to track practice time and compare your results.</p>
                <Link className="interview-primary" to={home}>Start Interview</Link>
              </section>
            ) : records.length === 0 ? (
              <section className="progress-panel"><h3>No interviews match these filters</h3><p>Adjust or clear the filters to see your practice records.</p></section>
            ) : !completed.length ? (
              <section className="progress-panel"><h3>No completed interviews</h3><p>Finish an interview to review or compare results.</p>
                <Link className="interview-secondary" to={history}>Open Interview History</Link>
              </section>
            ) : null}
            <PerformanceOverview summary={summary} hasPrevious={Boolean(range.previous)} />
            <PerformanceEvolution points={points} />
            <PerformanceByType types={summary.types} />
            <SkillsPerformance skills={skills} />
            <PracticeActivity records={records} now={now} />
            <InterviewComparison records={completed} />
            <ProgressCoaching records={completed} />
          </>
        )}
    </main>
  )
}

export default function InterviewProgress() {
  const source = useInterviewRecords()
  return (
    <div className="interview-simulator">
      <InterviewHeader />
      <ProgressContent key={source.epoch} source={source} />
    </div>
  )
}
