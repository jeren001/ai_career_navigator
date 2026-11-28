/**
 * Build the context for one position in the interview. A transport can use the
 * position and request key to retry without allocating another question.
 * Only submitted answers are included. Local drafts stay in the session.
 */
export function buildInterviewQuestionRequest(session, signal) {
  const index = session.questionIndex
  const answers = new Map(session.answers.map(answer => [answer.questionId, answer.text]))
  const skipped = new Set(session.skipped.map(item => item.questionId))
  const history = session.questions.slice(0, index).map(question => ({
    question,
    outcome: answers.has(question.id) ? 'answered' : skipped.has(question.id) ? 'skipped' : 'unanswered',
    ...(answers.has(question.id) ? { answer: answers.get(question.id) } : {})
  }))

  return {
    sessionId: session.id,
    configuration: session.configuration,
    index,
    requestKey: `${session.id}:${index}`,
    history,
    signal
  }
}

async function localQuestion({ configuration, index }) {
  const content = configuration.customQuestions?.[index]
  return content ? {
    status: 'available',
    question: {
      id: `custom-${index + 1}`,
      category: 'Custom question',
      content,
      source: 'custom'
    }
  } : { status: 'unavailable' }
}

/**
 * A connected provider owns sequencing for every position, including authored
 * questions. It can return available, pending, or unavailable for this slot.
 * Request failures can be retried with the same request key.
 */
export function createInterviewQuestionProvider(requestQuestion = localQuestion) {
  return {
    async getQuestion(request) {
      request.signal?.throwIfAborted()
      const response = await requestQuestion(request)
      request.signal?.throwIfAborted()
      return response
    }
  }
}

export const interviewQuestionProvider = createInterviewQuestionProvider(
  import.meta.env?.DEV && import.meta.env.VITE_INTERVIEW_DEV_FIXTURES === '1'
    ? async request => {
      const result = await localQuestion(request)
      if (result.status === 'available') return result
      return (await import('./interviewQuestionFixtures.js')).requestFixtureQuestion(request)
    }
    : undefined
)
