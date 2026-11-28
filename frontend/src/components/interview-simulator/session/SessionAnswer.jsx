import { countAnswerWords } from '../../../services/interviewResultsModel'

export default function SessionAnswer({
  answer, disabled, onChange, onSubmit, onSkip, canSkip, error
}) {
  const words = countAnswerWords(answer)
  const characters = [...answer].length

  return (
    <form className="interview-session-panel interview-session-answer" onSubmit={onSubmit}>
      <label htmlFor="session-answer">Your answer</label>
      <textarea id="session-answer" value={answer} rows={6} disabled={disabled}
        placeholder="Type your answer here..." aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'session-answer-count session-answer-error' : 'session-answer-count'}
        onChange={event => onChange(event.target.value)} />
      <p id="session-answer-count">{words} {words === 1 ? 'word' : 'words'} · {characters} {characters === 1 ? 'character' : 'characters'}</p>
      {error && <p id="session-answer-error" className="interview-session-error" role="alert">{error}</p>}
      <div className="interview-session-actions">
        <button type="submit" className="interview-primary" disabled={disabled}>Submit Answer</button>
        <button type="button" className="interview-secondary" disabled={!canSkip} onClick={onSkip}>Skip Question</button>
      </div>
    </form>
  )
}
