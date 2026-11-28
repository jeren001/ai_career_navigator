import { useState } from 'react'

const filters = [
  ['all', 'All Questions'],
  ['answered', 'Answered'],
  ['skipped', 'Skipped'],
  ['unanswered', 'Unanswered'],
  ['needs-improvement', 'Needs Improvement']
]

export function QuestionReviewContent({ question, evaluation }) {
  return (
    <div className="interview-review-content">
      <div>
        <h4>Your answer</h4>
        <p className="interview-review-text">{question.answer ?? 'No submitted answer.'}</p>
        {question.draft && (
          <>
            <h4>Unfinished draft</h4>
            <p className="interview-review-text">{question.draft}</p>
          </>
        )}
      </div>
      <div>
        <h4>AI evaluation</h4>
        <p className="interview-review-text">{evaluation?.feedback ?? 'Unavailable'}</p>
      </div>
      <div>
        <h4>Suggested answer</h4>
        <p className="interview-review-text">{evaluation?.suggestedAnswer ?? 'Unavailable'}</p>
      </div>
      <div>
        <h4>How to improve</h4>
        <p className="interview-review-text">{evaluation?.howToImprove ?? 'Unavailable'}</p>
      </div>
    </div>
  )
}

export function UndeliveredNote({ count }) {
  return count > 0 && (
    <p className="interview-results-note">
      {count} configured {count === 1 ? 'question was' : 'questions were'} never delivered and {count === 1 ? 'is' : 'are'} excluded from the review.
    </p>
  )
}

export default function QuestionReview({ questions, undelivered, evaluation }) {
  const [filter, setFilter] = useState('all')
  const evaluations = new Map(evaluation.questions?.map(item => [item.questionId, item]))
  const needsImprovementAvailable = evaluation.status === 'completed' &&
    evaluation.questions.some(item => typeof item.needsImprovement === 'boolean')
  const groups = {
    all: questions,
    answered: questions.filter(question => question.status === 'Answered'),
    skipped: questions.filter(question => question.status === 'Skipped'),
    unanswered: questions.filter(question => question.status === 'Unanswered' || question.status === 'Unfinished'),
    'needs-improvement': questions.filter(question => evaluations.get(question.id)?.needsImprovement)
  }
  const current = filter === 'needs-improvement' && !needsImprovementAvailable ? 'all' : filter
  const visible = groups[current]

  return (
    <section className="interview-results-panel" aria-labelledby="result-review-title">
      <h3 id="result-review-title">Question-by-question review</h3>
      <div className="interview-results-filters" aria-label="Question filters" role="group">
        {filters.filter(([value]) => value !== 'needs-improvement' || needsImprovementAvailable).map(([value, label]) => (
          <button key={value} type="button" className="interview-secondary"
            aria-pressed={current === value} onClick={() => setFilter(value)}>
            {label} ({groups[value].length})
          </button>
        ))}
      </div>
      <UndeliveredNote count={undelivered} />
      <div className="interview-review-list">
        {visible.length ? visible.map(question => {
          const questionEvaluation = evaluations.get(question.id)
          return (
            <details key={question.id}>
              <summary>
                <span>
                  <small>Question {question.number} · {question.category}</small>
                  <strong>{question.content}</strong>
                </span>
                <span className="interview-review-status">
                  {question.status}
                  {questionEvaluation?.score != null && <span>{questionEvaluation.score}%</span>}
                </span>
              </summary>
              <QuestionReviewContent question={question} evaluation={questionEvaluation} />
            </details>
          )
        }) : <p className="interview-results-note" role="status">
          {questions.length ? 'No delivered questions match this filter.' : 'No questions were delivered in this interview.'}
        </p>}
      </div>
    </section>
  )
}
