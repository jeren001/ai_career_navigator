import { Link } from 'react-router-dom'
import { formatInterviewDuration } from '../../../services/interviewResultsModel'
import { difficultyOptions, experienceOptions, optionLabel } from '../../../services/interviewSetupConfig'
import { interviewResultsPath, interviewSessionPath } from '../../../services/interviewSessionRepository'
import { interviewTypes } from '../interviewTypePresentation'

export default function HistoryRecord({ record, onRetake, onReport, onDelete }) {
  const { session, date, elapsedMs, score, evaluationStatus, status } = record
  const { configuration } = session
  const type = interviewTypes.find(type => type.id === session.interviewType)
  const Icon = type.icon
  const completed = session.status === 'completed'
  const facts = [
    ['Experience level', optionLabel(experienceOptions, configuration.experience)],
    ['Difficulty', optionLabel(difficultyOptions, configuration.difficulty)],
    ['Interview date', new Date(date).toLocaleDateString()],
    ['Interview duration', formatInterviewDuration(elapsedMs)],
    ['Questions answered', `${session.answers.length} of ${configuration.questionCount}`],
    ['Overall score', score === null ? evaluationStatus : `${score}%`]
  ]

  return (
    <li className="interview-history-record" data-session-id={session.id}>
      <div className="interview-history-record-heading">
        <span className="interview-history-icon" data-type={type.id}><Icon size={21} aria-hidden="true" /></span>
        <div>
          <h3>{configuration.role}</h3>
          <p>{type.title}{configuration.companyName && ` · ${configuration.companyName}`}</p>
        </div>
        <span className="interview-history-status">{status}</span>
      </div>
      <dl className="interview-history-facts">
        {facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <div className="interview-history-actions">
        <Link className="interview-secondary" to={completed ? interviewResultsPath(session.id) : interviewSessionPath(session.id)}>
          {completed ? 'View Results' : 'Resume Interview'}
        </Link>
        {onRetake && <button type="button" className="interview-secondary" onClick={() => onRetake(session)}>Retake Interview</button>}
        {completed && onReport && <button type="button" className="interview-secondary" onClick={() => onReport(record)}>Download Report</button>}
        {onDelete && <button type="button" className="interview-secondary interview-history-delete"
          onClick={() => onDelete(session)}>Delete Interview</button>}
      </div>
    </li>
  )
}
