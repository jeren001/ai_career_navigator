import { EvaluationBreakdown, EvaluationFeedback } from './EvaluationSections'
import { QuestionReviewContent, UndeliveredNote } from './QuestionReview'
import ResultsFacts from './ResultsFacts'

export default function InterviewReport({ results, configuration, evaluation }) {
  const evaluations = new Map(evaluation.questions?.map(item => [item.questionId, item]))
  return (
    <article className="interview-print-report">
      <h1>Interview report</h1>
      <h2>Interview configuration</h2>
      <ResultsFacts entries={[...results.overview, ...results.setup]} />
      <h2>Session statistics</h2>
      <ResultsFacts entries={results.stats} />
      <p>Completion rate and word statistics use submitted answers.</p>
      <h2>Evaluation</h2>
      {evaluation.status === 'completed' ? (
        <>
          <p>Overall score {evaluation.overallScore}% · {evaluation.performanceLevel}</p>
          <EvaluationBreakdown configuration={configuration} evaluation={evaluation} />
          <EvaluationFeedback evaluation={evaluation} />
        </>
      ) : <p>Evaluation unavailable. AI feedback and recommendations are unavailable.</p>}
      <h2>Questions and answers</h2>
      <UndeliveredNote count={results.undelivered} />
      {results.review.length ? results.review.map(question => {
        const item = evaluations.get(question.id)
        return (
          <section className="interview-print-question" key={question.id}>
            <h3>Question {question.number} · {question.category} · {question.status}
              {item?.score != null && ` · ${item.score}%`}
            </h3>
            <p className="interview-review-text">{question.content}</p>
            <QuestionReviewContent question={question} evaluation={item} />
          </section>
        )
      }) : <p>No questions were delivered.</p>}
    </article>
  )
}
