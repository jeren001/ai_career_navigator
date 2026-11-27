const conversations = '/api/career-assistant/conversations'

export function listConversations(request, offset, signal) {
  return request(`${conversations}?offset=${offset}`, { signal })
}

export function createConversation(request, language, signal) {
  return request(conversations, { method: 'POST', body: { language }, signal })
}

export function getConversation(request, id, signal, before) {
  const query = before == null ? '' : `?before=${before}`
  return request(`${conversations}/${id}${query}`, { signal })
}

export function sendAssistantMessage(request, { id, revision }, message, context, signal) {
  return request(`${conversations}/${id}/messages`, {
    method: 'POST', body: { revision, message, context }, signal
  })
}

export function deleteConversation(request, id, signal) {
  return request(`${conversations}/${id}`, { method: 'DELETE', signal })
}

export function turnMessages(conversationId, turn) {
  const id = `${conversationId}:${turn.turn_number}`
  return [
    { id: id + ':user', role: 'user', content: turn.user_message, createdAt: turn.created_at },
    { id: id + ':assistant', role: 'assistant', content: turn.assistant_message, createdAt: turn.created_at,
      source: turn.source, reason: turn.reason }
  ]
}
