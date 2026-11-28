import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import useInterviewWorkspaceEpoch from '../useInterviewWorkspaceEpoch'
import InterviewHeader from '../InterviewHeader'
import InterviewConfirmation from '../InterviewConfirmation'
import { getInterviewWorkspace } from '../../../services/interviewSessionDatabase'
import { interviewSessionPath, interviewSessionRepository } from '../../../services/interviewSessionRepository'
import '../../../styles/interview-simulator.css'
import '../../../styles/interview-setup.css'

function currentWorkspace() {
  try {
    return getInterviewWorkspace()
  } catch {
    return null
  }
}

function SetupWorkspace({ heading, config, children }) {
  const [workspace] = useState(currentWorkspace)
  const [draft, setDraft] = useState(config.readDraft)
  const [attempted, setAttempted] = useState(false)
  const [starting, setStarting] = useState(false)
  const [startError, setStartError] = useState('')
  const [conflict, setConflict] = useState(null)
  const pendingStart = useRef(false)
  const navigate = useNavigate()
  const title = useRef(null)
  const errors = attempted ? config.validateDraft(draft) : {}

  useEffect(() => {
    window.scrollTo(0, 0)
    title.current.focus({ preventScroll: true })
  }, [])

  function updateDraft(field, value) {
    if (starting || currentWorkspace() !== workspace) return
    const updated = { ...draft, [field]: value }
    setDraft(updated)
    config.saveDraft(updated)
    setStartError('')
  }

  function prepareInterview(event) {
    event.preventDefault()
    setAttempted(true)
    const validation = config.validateDraft(draft)
    if (Object.keys(validation).length) {
      const firstInvalid = [...event.currentTarget.elements].find(control => validation[control.name])
      requestAnimationFrame(() => firstInvalid?.focus())
      return
    }

    startSession(config.buildConfiguration(draft))
  }

  async function startSession(configuration, replaceId) {
    if (pendingStart.current) return
    if (currentWorkspace() !== workspace) {
      setStartError('The interview workspace changed. Reopen this setup before starting.')
      return
    }
    pendingStart.current = true
    setStarting(true)
    setStartError('')
    try {
      const result = await interviewSessionRepository.start(configuration, { replaceId })
      if (result.conflict) setConflict({ session: result.conflict, configuration })
      else navigate(interviewSessionPath(result.session.id))
    } catch {
      setStartError('The interview could not be started. Check that browser storage is available and try again.')
    } finally {
      pendingStart.current = false
      setStarting(false)
    }
  }

  return (
    <div className="interview-simulator">
      <InterviewHeader />
      <main className="interview-setup">
        <Link to="/interview-simulator" className="interview-setup-back">
          <ArrowLeft size={18} aria-hidden="true" /> Back to Interview Simulator
        </Link>
        <div className="interview-setup-heading">
          <h2 ref={title} tabIndex={-1}>{heading}</h2>
          <p>Choose what you want to practice in your text-based interview.</p>
        </div>
        <form aria-busy={starting} noValidate onSubmit={prepareInterview} className="interview-setup-form">
          {children({
            draft, errors, updateDraft, starting, startError: conflict ? '' : startError,
            configuration: config.buildConfiguration(draft)
          })}
        </form>
        {conflict && (
          <InterviewConfirmation title="Unfinished interview" confirmLabel="End and start new"
            busy={starting} error={startError}
            onCancel={() => {
              setConflict(null)
              setStartError('')
            }}
            onConfirm={() => startSession(conflict.configuration, conflict.session.id)}
            extraAction={<Link className="interview-secondary" to={interviewSessionPath(conflict.session.id)}
              aria-disabled={starting || undefined} tabIndex={starting ? -1 : undefined}
              onClick={event => { if (starting) event.preventDefault() }}>Resume existing</Link>}>
            Resume your existing interview or end it and start this one. Your previous progress will be saved.
          </InterviewConfirmation>
        )}
      </main>
    </div>
  )
}

export default function SetupFrame(props) {
  const epoch = useInterviewWorkspaceEpoch()
  return <SetupWorkspace key={epoch} {...props} />
}
