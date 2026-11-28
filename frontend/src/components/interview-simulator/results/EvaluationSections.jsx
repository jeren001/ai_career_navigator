import { evaluationCategories } from '../../../services/interviewResultsModel'
import ResultsFacts from './ResultsFacts'

const statusLabels = {
  unavailable: 'Evaluation unavailable',
  pending: 'Evaluation pending',
  processing: 'Evaluation processing',
  failed: 'Evaluation could not be loaded'
}

export function PerformanceOverview({ overview, evaluation, onRetry }) {
  const completed = evaluation.status === 'completed'
  return (
    <section className="interview-results-panel interview-results-overview" aria-labelledby="result-overview-title">
      <div className="interview-score">
        <h3>Overall score</h3>
        {completed ? (
          <div className="interview-score-ring" role="img" aria-label={`Overall score ${evaluation.overallScore} out of 100`}
            style={{ '--score': `${evaluation.overallScore}%` }}>
            <span>{evaluation.overallScore}%</span>
          </div>
        ) : <p role="status">{statusLabels[evaluation.status] ?? 'Loading evaluation…'}</p>}
        <p>Performance level <strong>{completed ? evaluation.performanceLevel : 'Unavailable'}</strong></p>
        {['failed', 'pending', 'processing'].includes(evaluation.status) &&
          <button type="button" className="interview-secondary" onClick={onRetry}>Check Evaluation</button>}
      </div>
      <div>
        <h3 id="result-overview-title">Performance overview</h3>
        <ResultsFacts entries={overview} />
      </div>
    </section>
  )
}

export function EvaluationBreakdown({ configuration, evaluation }) {
  const scores = new Map(evaluation.categories?.map(item => [item.label, item.score]))
  return (
    <section className="interview-results-panel">
      <h3>Performance breakdown</h3>
      <ul className="interview-evaluation-categories">
        {evaluationCategories(configuration).map(label => (
          <li key={label}>
            <span>{label}</span>
            {scores.has(label) ? (
              <>
                <progress max={100} value={scores.get(label)} aria-label={label} />
                <strong>{scores.get(label)}%</strong>
              </>
            ) : <span>Unavailable</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function EvaluationFeedback({ evaluation }) {
  const feedback = evaluation.feedback
  const sections = [
    ['Strengths', feedback?.strengths],
    ['Areas for improvement', feedback?.improvements],
    ['Recommendations', feedback?.recommendations]
  ]
  return (
    <section className="interview-results-panel">
      <h3>AI feedback</h3>
      <div className="interview-feedback-grid">
        <div><h4>Overall feedback</h4><p>{feedback?.overall || 'Unavailable'}</p></div>
        {sections.map(([label, items]) => (
          <div key={label}>
            <h4>{label}</h4>
            {items?.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Unavailable</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
