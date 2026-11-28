const conversations = '/api/career-assistant/conversations'

export async function listConversations(request, offset, signal) {
  const page = await request(`${conversations}?offset=${offset}`, { signal })
  // Backends without list previews can return turn one directly via the history cursor.
  const entries = [...page.conversations]
  for (let index = 0; index < entries.length; index += 4) {
    const batch = entries.slice(index, index + 4)
    const hydrated = await Promise.all(batch.map(async (item) => {
      if (item.title?.trim() || item.preview?.trim() || !item.revision || signal?.aborted) return item
      try {
        const history = await request(`${conversations}/${item.id}?before=2&limit=1`, { signal })
        return { ...item, preview: history.turns[0]?.user_message }
      } catch {
        // One deleted or temporarily unavailable history should not hide the list.
        return item
      }
    }))
    entries.splice(index, batch.length, ...hydrated)
  }
  return { ...page, conversations: entries }
}

export function conversationTitle(item, locale, t) {
  if (item.title?.trim()) return item.title
  const preview = item.preview?.trim().replace(/\s+/g, ' ')
  if (preview) {
    const characters = [...preview]
    return characters.length > 80 ? characters.slice(0, 80).join('') + '…' : preview
  }
  if (!item.revision) return t('Untitled conversation', '未命名对话')
  const date = new Date(item.created_at).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' })
  return t(`Conversation from ${date}`, `${date}的对话`)
}

export async function supportsResumeContext(request, signal) {
  const spec = await request('/api-docs/openapi.json', { signal })
  return Boolean(spec.components?.schemas?.AssistantMessage?.properties?.resume_context)
}

export function listAssistantResumes(request, offset, signal) {
  return request(`/api/resumes?offset=${offset}`, { signal })
}

export function createConversation(request, language, signal) {
  return request(conversations, { method: 'POST', body: { language }, signal })
}

export function getConversation(request, id, signal, before) {
  const query = before == null ? '' : `?before=${before}`
  return request(`${conversations}/${id}${query}`, { signal })
}

export function sendAssistantMessage(request, { id, revision }, message, context, signal, resume) {
  return request(`${conversations}/${id}/messages`, {
    method: 'POST',
    body: {
      revision, message, context,
      ...(resume?.id && resume.consent === true && { resume_context: { resume_id: resume.id, consent: true } })
    },
    signal
  })
}

export function deleteConversation(request, id, signal) {
  return request(`${conversations}/${id}`, { method: 'DELETE', signal })
}

export function updateConversation(request, id, changes, signal) {
  return request(`${conversations}/${id}`, { method: 'PATCH', body: changes, signal })
}

export function setResponseBookmark(request, { conversationId, turnNumber }, bookmarked, signal) {
  return request(`${conversations}/${conversationId}/messages/${turnNumber}/bookmark`, {
    method: 'PUT', body: { bookmarked }, signal
  })
}

export async function listBookmarkedResponses(request, offset, signal) {
  const { bookmarks, next_offset } = await request(`/api/career-assistant/bookmarks?offset=${offset}`, { signal })
  return {
    responses: bookmarks.map((turn) => assistantMessage(turn.conversation_id, turn)),
    nextOffset: next_offset
  }
}

function assistantMessage(conversationId, turn) {
  return {
    id: `${conversationId}:${turn.turn_number}:assistant`, role: 'assistant', content: turn.assistant_message,
    conversationId, turnNumber: turn.turn_number, savedAt: turn.bookmarked_at ?? null,
    createdAt: turn.created_at, source: turn.source, reason: turn.reason
  }
}

export function turnMessages(conversationId, turn) {
  const id = `${conversationId}:${turn.turn_number}`
  return [
    { id: id + ':user', role: 'user', content: turn.user_message, createdAt: turn.created_at },
    assistantMessage(conversationId, turn)
  ]
}
