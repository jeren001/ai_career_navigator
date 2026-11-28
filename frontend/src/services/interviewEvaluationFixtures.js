import { evaluationCategories } from './interviewResultsModel.js'

// Deliberately labeled synthetic values for development UI verification only.
export async function requestEvaluationFixture({ session, sessionId, signal }) {
  signal?.throwIfAborted()
  if (!session.answers.length) return { sessionId, status: 'unavailable' }
  const type = session.configuration.types?.[0] ?? session.interviewType
  return {
    sessionId, status: 'completed', source: 'fixture', overallScore: 72, performanceLevel: 'Development fixture',
    evaluatedAt: new Date(session.completedAt).toISOString(),
    categories: evaluationCategories(session.configuration).map(label => ({ label, score: 72 })),
    questions: session.answers.map(({ questionId }) => ({
      questionId, score: 72, feedback: 'Development fixture feedback.',
      suggestedAnswer: 'Development fixture suggested answer.',
      howToImprove: 'Development fixture improvement text.', needsImprovement: true
    })),
    feedback: {
      overall: 'Development fixture overview.',
      strengths: ['Development fixture strength.'],
      improvements: ['Development fixture improvement.'],
      recommendations: ['Development fixture recommendation.']
    },
    practiceFocus: [{ type, entries: ['Development fixture practice topic'] }]
  }
}
