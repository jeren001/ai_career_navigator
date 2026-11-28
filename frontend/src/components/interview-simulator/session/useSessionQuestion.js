import { useEffect, useState } from 'react'
import { buildInterviewQuestionRequest, interviewQuestionProvider } from '../../../services/interviewQuestionProvider'
import { interviewSessionRepository } from '../../../services/interviewSessionRepository'

export default function useSessionQuestion({ session, question, onUpdate }) {
  const { id, questionIndex, status } = session
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState(null)
  const requestKey = `${questionIndex}:${attempt}`
  const enabled = !question && (status === 'waiting' || status === 'active')

  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()

    async function load() {
      try {
        const response = await interviewQuestionProvider.getQuestion(buildInterviewQuestionRequest(session, controller.signal))
        if (controller.signal.aborted) return
        if (response.status === 'available') {
          const updated = await interviewSessionRepository.update(id, {
            type: 'question', index: questionIndex, question: response.question
          })
          if (!controller.signal.aborted) onUpdate(updated)
        } else {
          if (!['pending', 'unavailable'].includes(response.status)) throw new Error('Unexpected question provider response.')
          setResult({ key: requestKey, state: response.status })
        }
      } catch {
        if (!controller.signal.aborted) setResult({ key: requestKey, state: 'error' })
      }
    }

    load()
    return () => controller.abort()
  }, [enabled, id, questionIndex, requestKey, onUpdate, session])

  return {
    state: status === 'paused' ? 'paused' : result?.key === requestKey ? result.state : 'loading',
    retry: () => setAttempt(previous => previous + 1)
  }
}
