
// ==========================================
// PROJECT: AI CAREER
// SERVICE: Assistant Service
// PURPOSE: Handle assistant communication
// ==========================================

// Temporary mock response for frontend testing

export function sendAssistantMessage(messages, { signal } = {}) {

  return new Promise((resolve, reject) => {

    if (signal?.aborted) {
      reject(new DOMException('Request cancelled', 'AbortError'))
      return
    }

    function handleAbort() {
      clearTimeout(timer)
      reject(new DOMException('Request cancelled', 'AbortError'))
    }

    const timer = setTimeout(() => {

      signal?.removeEventListener('abort', handleAbort)

      resolve({
        id: crypto.randomUUID(),
        role: 'assistant',
        content:
          'This is a simulated response for testing the AI Career Assistant.\n\n' +
          'Once connected to the AI service, I will provide personalized career guidance based on your questions and goals.',
        createdAt: new Date().toISOString()
      })

    }, 1800)

    signal?.addEventListener('abort', handleAbort, {
      once: true
    })

  })
}
