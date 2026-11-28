import { interviewTypeLabels } from '../../../services/interviewSessionModel'
import { difficultyOptions, experienceOptions, languageOptions, optionLabel } from '../../../services/interviewSetupConfig'

function clockText(milliseconds, round) {
  const seconds = round(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const pad = value => String(value).padStart(2, '0')
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${pad(minutes)}:${pad(seconds % 60)}`
}

export default function SessionOverview({ session, timing }) {
  const { configuration, questionIndex } = session
  const total = configuration.questionCount
  const completed = session.status === 'completed'
  const timed = timing.remainingMs !== null
  const warning = !completed && session.startedAt !== null && timed && timing.remainingMs > 0
    ? timing.remainingMs <= 60000 ? 'One minute or less remaining.'
      : timing.remainingMs <= 300000 ? 'Five minutes or less remaining.' : ''
    : ''
  const information = [
    ['Job role', configuration.role],
    ...(configuration.companyName ? [['Company', configuration.companyName]] : []),
    ['Experience', optionLabel(experienceOptions, configuration.experience)],
    ['Difficulty', optionLabel(difficultyOptions, configuration.difficulty)],
    ['Language', optionLabel(languageOptions, configuration.language)]
  ]

  return (
    <section className="interview-session-overview" aria-labelledby="interview-session-title">
      <h2 id="interview-session-title">{interviewTypeLabels[session.interviewType]}</h2>
      <dl className="interview-session-details">
        {information.map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <div className="interview-session-tracking">
        <div>
          <span>{timed ? 'Remaining time' : 'Elapsed time · Unlimited'}</span>
          <strong role="timer" aria-label={timed ? 'Remaining time' : 'Elapsed time'}>
            {timed ? clockText(timing.remainingMs, Math.ceil) : clockText(timing.elapsedMs, Math.floor)}
          </strong>
        </div>
        <div>
          <span id="session-progress-label">{completed
            ? `${questionIndex} of ${total} questions handled`
            : `Question ${questionIndex + 1} of ${total}`}</span>
          <progress value={questionIndex} max={total} aria-labelledby="session-progress-label" />
        </div>
      </div>
      <p className={warning.startsWith('One') ? 'interview-session-warning urgent' : 'interview-session-warning'}
        role="status">{warning}</p>
    </section>
  )
}
