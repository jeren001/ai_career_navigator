import { useEffect, useRef } from 'react'
import mascot from '../../../assets/mascot.png'

export default function SessionQuestion({ question, index, state, onRetry }) {
  const heading = useRef(null)
  const messages = {
    pending: 'The next question is being prepared.',
    unavailable: 'Questions from the AI interviewer are unavailable until the question service is connected.',
    error: 'The question could not be loaded. Try again.'
  }

  useEffect(() => {
    heading.current.focus({ preventScroll: index === 0 })
  }, [index])

  return (
    <section className="interview-session-panel interview-session-question" aria-labelledby="interviewer-title">
      <img src={mascot} alt="" />
      <div>
        <h3 ref={heading} id="interviewer-title" tabIndex={-1}>AI Interviewer</h3>
        <p className="interview-session-category">
          Question {index + 1}{question ? ` · ${question.category}` : ''}
        </p>
        {question ? (
          <p className="interview-question-text">{question.content}</p>
        ) : state === 'paused' ? (
          <p>Resume the interview to load the next question.</p>
        ) : state === 'loading' ? (
          <p role="status">Loading question…</p>
        ) : (
          <>
            <p role="status">{messages[state]}</p>
            <button type="button" className="interview-secondary" onClick={onRetry}>
              {state === 'pending' ? 'Check for Question' : 'Retry Question'}
            </button>
          </>
        )}
      </div>
    </section>
  )
}
