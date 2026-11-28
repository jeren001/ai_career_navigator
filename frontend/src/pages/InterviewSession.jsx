import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import InterviewConfirmation from '../components/interview-simulator/InterviewConfirmation'
import useInterviewWorkspaceEpoch from '../components/interview-simulator/useInterviewWorkspaceEpoch'
import InterviewHeader from '../components/interview-simulator/InterviewHeader'
import SessionOverview from '../components/interview-simulator/session/SessionOverview'
import SessionQuestion from '../components/interview-simulator/session/SessionQuestion'
import SessionAnswer from '../components/interview-simulator/session/SessionAnswer'
import useSessionClock from '../components/interview-simulator/session/useSessionClock'
import useSessionQuestion from '../components/interview-simulator/session/useSessionQuestion'
import useInterviewExitProtection from '../components/interview-simulator/session/useInterviewExitProtection'
import { completionLabels, InterviewSessionConflictError } from '../services/interviewSessionModel'
import { interviewResultsPath, interviewSessionRepository } from '../services/interviewSessionRepository'
import '../styles/interview-simulator.css'
import '../styles/interview-session.css'

const home = '/interview-simulator'

function SessionCompletion({ session }) {
  const title = useRef(null)
  useEffect(() => { title.current.focus() }, [])

  return (
    <section className="interview-session-panel interview-session-completion">
      <h3 ref={title} tabIndex={-1}>Interview complete</h3>
      <p>{completionLabels[session.completionReason]}. Your progress has been saved.</p>
      <div className="interview-session-actions">
        <Link className="interview-primary" to={interviewResultsPath(session.id)}>View Results</Link>
        <Link className="interview-secondary" to={home}>Back to Interview Simulator</Link>
      </div>
    </section>
  )
}

function SessionWorkspace({ initialSession }) {
  const [session, setSession] = useState(initialSession)
  const [input, setInput] = useState(null)
  const [saveError, setSaveError] = useState('')
  const [answerError, setAnswerError] = useState('')
  const [actionError, setActionError] = useState('')
  const [busy, setBusy] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const pendingAction = useRef(false)
  const pendingDraft = useRef(null)
  const leaveRequest = useRef(null)
  const expiryAttempted = useRef(false)
  const answerInput = useRef(null)

  const question = session.questions[session.questionIndex]
  const questionId = question?.id
  const savedAnswer = question && Object.hasOwn(session.unfinishedAnswers, questionId) ? session.unfinishedAnswers[questionId] : ''
  const answer = question && input?.questionId === questionId ? input.text : savedAnswer
  const timing = useSessionClock(session)
  const completed = session.status === 'completed'
  const expired = session.status === 'active' && timing.remainingMs === 0
  const canAnswer = session.status === 'active' && Boolean(question) && !expired && !busy
  const blocker = useInterviewExitProtection(!completed, !completed && (session.startedAt !== null || saveError))
  const provider = useSessionQuestion({ session, question, onUpdate: setSession })

  useEffect(() => {
    if (completed && blocker.state === 'blocked') blocker.reset()
  }, [blocker, completed])

  useEffect(() => {
    if (!expired || expiryAttempted.current) return
    expiryAttempted.current = true
    interviewSessionRepository.update(session.id, { type: 'expire', questionId, text: answer }).then(setSession).catch(() => {
      setActionError('Time expired. Your session could not be saved. Retry to save your progress.')
    })
  }, [answer, expired, questionId, session.id])

  function changeAnswer(text) {
    setInput({ questionId, text })
    setAnswerError('')
    const saved = interviewSessionRepository.update(session.id, { type: 'draft', questionId, text }).then(updated => {
      if (pendingDraft.current === saved) {
        setSession(updated)
        setSaveError('')
      }
      return true
    }).catch(error => {
      if (pendingDraft.current === saved) {
        setSaveError(error instanceof InterviewSessionConflictError ? error.message : 'Your draft could not be saved.')
      }
      return false
    })
    pendingDraft.current = saved
  }

  async function confirmLeave() {
    if (leaveRequest.current) return
    const request = {}
    leaveRequest.current = request
    try {
      const saved = await pendingDraft.current
      // If an in-flight save just failed, show that failure before asking again.
      if (leaveRequest.current !== request || (saved === false && !saveError)) return
      blocker.proceed()
    } finally {
      if (leaveRequest.current === request) leaveRequest.current = null
    }
  }

  async function runAction(type) {
    if (pendingAction.current) return
    pendingAction.current = true
    setBusy(true)
    setActionError('')
    try {
      const updated = await interviewSessionRepository.update(session.id, { type, questionId, text: answer })
      setSession(updated)
      pendingDraft.current = null
      setSaveError('')
      setAnswerError('')
      setConfirmation(null)
      if (updated.questionIndex !== session.questionIndex) setInput(null)
    } catch (error) {
      setActionError(error instanceof InterviewSessionConflictError
        ? error.message
        : 'The change could not be saved. Try again. Your answer is still in this page.')
    } finally {
      pendingAction.current = false
      setBusy(false)
    }
  }

  function submitAnswer(event) {
    event.preventDefault()
    if (!canAnswer) return
    if (!answer.trim()) {
      setAnswerError('Enter an answer before submitting.')
      answerInput.current?.querySelector('textarea')?.focus()
      return
    }
    runAction('answer')
  }

  return (
    <main className="interview-session">
      <SessionOverview session={session} timing={timing} />
      {completed ? <SessionCompletion session={session} /> : (
        <>
          {session.status === 'paused' && <p className="interview-session-paused" role="status">Interview paused. Your progress is saved.</p>}
          <SessionQuestion question={question} index={session.questionIndex} state={provider.state} onRetry={provider.retry} />
          <div ref={answerInput}>
            <SessionAnswer answer={answer} disabled={!canAnswer} onChange={changeAnswer} onSubmit={submitAnswer}
              onSkip={() => setConfirmation('skip')} canSkip={canAnswer} error={answerError} />
          </div>
          {saveError && (
            <div className="interview-session-actions">
              <p className="interview-session-error" role="alert">{saveError}</p>
              <button className="interview-secondary" type="button" disabled={expired || busy}
                onClick={() => changeAnswer(answer)}>Retry Draft Save</button>
            </div>
          )}
          {actionError && !confirmation && <p className="interview-session-error" role="alert">{actionError}</p>}
          <div className="interview-session-actions" aria-label="Session controls">
            {expired ? (
              <button className="interview-secondary" type="button" disabled={busy} onClick={() => runAction('expire')}>Retry Saving Session</button>
            ) : (
              <>
                {session.startedAt !== null && (
                  <button className="interview-secondary" type="button" disabled={busy}
                    onClick={() => runAction(session.status === 'paused' ? 'resume' : 'pause')}>
                    {session.status === 'paused' ? 'Resume Interview' : 'Pause Interview'}
                  </button>
                )}
                <button className="interview-secondary" type="button" disabled={busy} onClick={() => setConfirmation('end')}>
                  End Interview
                </button>
              </>
            )}
          </div>
          {confirmation && !expired && (
            <InterviewConfirmation title={confirmation === 'skip' ? 'Skip question?' : 'End interview?'}
              confirmLabel={confirmation === 'skip' ? 'Skip Question' : 'End Interview'}
              busy={busy} error={actionError} onCancel={() => { setConfirmation(null); setActionError('') }}
              onConfirm={() => runAction(confirmation)}>
              {confirmation === 'skip'
                ? 'Skip this question and continue to the next one?'
                : 'Are you sure you want to end this interview? Your progress will be saved.'}
            </InterviewConfirmation>
          )}
        </>
      )}
      {!completed && blocker.state === 'blocked' && (
        <InterviewConfirmation title="Leave interview?" confirmLabel="Leave Interview" cancelLabel="Stay"
          onCancel={() => { leaveRequest.current = null; blocker.reset() }} onConfirm={confirmLeave}>
          {saveError ? 'The latest draft could not be saved. Stay to retry or copy your answer, or leave without saving the draft.'
            : session.status === 'active'
              ? 'Your progress is saved. The timer will keep running until you pause or finish.'
              : 'Your progress is saved. You can resume from the Interview Simulator home page.'}
        </InterviewConfirmation>
      )}
    </main>
  )
}

function LoadSession({ id }) {
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!id) return
    let current = true
    interviewSessionRepository.get(id).then(session => {
      if (current) setResult({ attempt, session })
    }).catch(() => {
      if (current) setResult({ attempt, error: true })
    })
    return () => { current = false }
  }, [id, attempt])

  if (result?.session) return <SessionWorkspace initialSession={result.session} />

  const loading = id && result?.attempt !== attempt
  return (
    <main className="interview-session">
      <section className="interview-session-panel interview-session-completion">
        <h2>{loading ? 'Loading interview session…' : 'Interview session unavailable'}</h2>
        {loading ? <p role="status">Recovering your session.</p> : (
          <>
            <p>{result?.error
              ? 'The session could not be read. Check that browser storage is available and try again.'
              : 'Start an interview from a setup page, or resume an unfinished interview from the simulator home.'}</p>
            <div className="interview-session-actions">
              {result?.error && <button className="interview-secondary" type="button"
                onClick={() => setAttempt(value => value + 1)}>Retry</button>}
              <Link className="interview-primary" to={home}>Back to Interview Simulator</Link>
            </div>
          </>
        )}
      </section>
    </main>
  )
}

export default function InterviewSession() {
  const [params] = useSearchParams()
  const id = params.get('id')
  const workspaceEpoch = useInterviewWorkspaceEpoch()

  useEffect(() => { window.scrollTo(0, 0) }, [id])

  return (
    <div className="interview-simulator">
      <InterviewHeader />
      <LoadSession key={`${workspaceEpoch}:${id}`} id={id} />
    </div>
  )
}
