import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import InterviewHeader from '../components/interview-simulator/InterviewHeader'
import useInterviewWorkspaceEpoch from '../components/interview-simulator/useInterviewWorkspaceEpoch'
import { EvaluationBreakdown, EvaluationFeedback, PerformanceOverview } from '../components/interview-simulator/results/EvaluationSections'
import InterviewReport from '../components/interview-simulator/results/InterviewReport'
import QuestionReview from '../components/interview-simulator/results/QuestionReview'
import ResultsFacts from '../components/interview-simulator/results/ResultsFacts'
import { interviewEvaluationProvider } from '../services/interviewEvaluationProvider'
import { buildInterviewResults } from '../services/interviewResultsModel'
import { interviewSessionPath, interviewSessionRepository } from '../services/interviewSessionRepository'
import { restoreInterviewSetup } from '../services/interviewSetupConfigs'
import '../styles/interview-simulator.css'
import '../styles/interview-results.css'

const home = '/interview-simulator'

function CompletedResults({ session, storedEvaluation }) {
  const [state, setState] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const navigate = useNavigate()
  const title = useRef(null)
  const results = useMemo(() => buildInterviewResults(session), [session])
  const evaluation = state?.attempt === attempt ? state.evaluation : { status: 'loading' }
  const practiceFocus = evaluation.status === 'completed' ? evaluation.practiceFocus : null

  useEffect(() => {
    window.scrollTo(0, 0)
    title.current.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const stored = attempt === 0 ? storedEvaluation : await interviewSessionRepository.getEvaluation(session.id)
        if (controller.signal.aborted) return
        if (!stored) {
          setState({ attempt, evaluation: { status: 'unavailable' } })
          return
        }
        if (stored.status === 'completed') {
          setState({ attempt, evaluation: stored })
          return
        }
        const response = await interviewEvaluationProvider.getEvaluation({ session, signal: controller.signal })
        if (controller.signal.aborted) return
        const evaluation = response.status === 'unavailable' ? stored
          : await interviewSessionRepository.saveEvaluation(session.id, response)
        if (!controller.signal.aborted) setState({ attempt, evaluation })
      } catch {
        if (!controller.signal.aborted) setState({ attempt, evaluation: { status: 'failed' } })
      }
    }
    load()
    return () => controller.abort()
  }, [session, storedEvaluation, attempt])

  return (
    <>
      <main className="interview-results">
        <h2 ref={title} tabIndex={-1}>Interview Results</h2>
        <PerformanceOverview overview={results.overview} evaluation={evaluation} onRetry={() => setAttempt(value => value + 1)} />
        <section className="interview-results-panel">
          <h3>Interview statistics</h3>
          <ResultsFacts entries={results.stats} className="interview-results-stats" />
          <p className="interview-results-note">Completion rate is the share of configured questions with submitted answers. Word statistics exclude unfinished drafts.</p>
        </section>
        <div className="interview-results-analysis">
          <EvaluationBreakdown configuration={session.configuration} evaluation={evaluation} />
          <EvaluationFeedback evaluation={evaluation} />
        </div>
        <QuestionReview questions={results.review} undelivered={results.undelivered} evaluation={evaluation} />
        <section className="interview-results-panel" aria-label="Results actions">
          <div className="interview-results-actions">
            <button type="button" className="interview-primary"
              onClick={() => navigate(restoreInterviewSetup(session.configuration))}>Retake Interview</button>
            <button type="button" className="interview-secondary" disabled={!practiceFocus?.length}
              aria-describedby={!practiceFocus?.length ? 'practice-unavailable' : undefined}
              onClick={() => navigate(restoreInterviewSetup(session.configuration, practiceFocus))}>Practice Weak Areas</button>
            <button type="button" className="interview-secondary" onClick={() => window.print()}>Download Report</button>
            <Link className="interview-secondary" to="/interview-simulator/history">View History</Link>
            <Link className="interview-secondary" to={home}>Back to Home</Link>
          </div>
          <p className="interview-results-note">Choose Save as PDF in the print dialog to download the full report.</p>
          {!practiceFocus?.length && <p className="interview-results-note" id="practice-unavailable">
            Practice Weak Areas requires evaluation with identified practice topics.
          </p>}
        </section>
      </main>
      <InterviewReport results={results} configuration={session.configuration} evaluation={evaluation} />
    </>
  )
}

function ResultsLoader({ sessionId }) {
  const [state, setState] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const result = state?.attempt === attempt ? state : null

  useEffect(() => {
    let current = true
    interviewSessionRepository.getWithEvaluation(sessionId).then(record => {
      if (current) setState({ attempt, ...record })
    }).catch(() => {
      if (current) setState({ attempt, error: true })
    })
    return () => { current = false }
  }, [sessionId, attempt])

  if (result?.session?.status === 'completed') return <CompletedResults session={result.session} storedEvaluation={result.evaluation} />

  return (
    <main className="interview-results">
      <section className="interview-results-panel">
        <h2>{!result ? 'Loading interview results…' : result.session ? 'Interview still in progress' : 'Interview results unavailable'}</h2>
        <p role={!result ? 'status' : undefined}>{!result ? 'Reading the saved session.'
          : result.error ? 'The saved interview could not be read. Check that browser storage is available and retry.'
            : result.session ? 'Finish the interview to view its results.'
              : 'This session could not be found in the current interview workspace.'}</p>
        {result && (
          <div className="interview-results-actions">
            {result.error && <button type="button" className="interview-primary" onClick={() => setAttempt(value => value + 1)}>Retry</button>}
            {result.session && <Link className="interview-primary" to={interviewSessionPath(result.session.id)}>Resume Interview</Link>}
            <Link className="interview-secondary" to={home}>Back to Home</Link>
          </div>
        )}
      </section>
    </main>
  )
}

export default function InterviewResults() {
  const { sessionId } = useParams()
  const workspaceEpoch = useInterviewWorkspaceEpoch()
  return (
    <div className="interview-simulator interview-report-page">
      <InterviewHeader />
      <ResultsLoader key={`${workspaceEpoch}:${sessionId}`} sessionId={sessionId} />
    </div>
  )
}
