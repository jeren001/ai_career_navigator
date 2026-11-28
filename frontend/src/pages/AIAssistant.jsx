import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AssistantHeader from '../components/ai-assistant/AssistantHeader'
import AssistantBackground from '../components/ai-assistant/AssistantBackground'
import AssistantWelcome from '../components/ai-assistant/AssistantWelcome'
import ChatInput from '../components/ai-assistant/ChatInput'
import ChatConversation from '../components/ai-assistant/ChatConversation'
import ChatHistory from '../components/ai-assistant/ChatHistory'
import SavedResponses from '../components/ai-assistant/SavedResponses'
import ResumeConsent from '../components/ai-assistant/ResumeConsent'
import Sidebar from '../components/dashboard/Sidebar'
import { apiErrorText, useLocale } from '../lib/locale.js'
import { useSession } from '../session/session.js'
import {
  conversationTitle, createConversation, deleteConversation, getConversation, listBookmarkedResponses,
  listConversations, sendAssistantMessage, setResponseBookmark, turnMessages, updateConversation
} from '../services/assistantService.js'
import '../styles/ai-assistant.css'

const conversationIdPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const inaccessible = (error) => [400, 403, 404].includes(error.status)

const contextOptions = [
  ['profile', 'Profile', '个人资料'], ['assessment', 'Assessment', '测评'],
  ['career_match', 'Career Match', '职业匹配'], ['skills', 'Skills', '技能'],
  ['roadmap', 'Roadmap', '路线图'], ['practice', 'Practice history', '练习记录']
]

export default function AIAssistant() {
  const { request } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const ids = searchParams.getAll('conversation')
  const conversationId = ids[0]?.toLowerCase() ?? null
  const invalidId = ids.length > 1 || (conversationId !== null && !conversationIdPattern.test(conversationId))
  const { locale, t } = useLocale()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(null)
  const [view, setView] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [saved, setSaved] = useState([])
  const [savedOffset, setSavedOffset] = useState(null)
  const [offset, setOffset] = useState(null)
  const [before, setBefore] = useState(null)
  const [needsReload, setNeedsReload] = useState(false)
  const [recovery, setRecovery] = useState(null)
  const [resume, setResume] = useState({ id: '', consent: false })
  const [context, setContext] = useState([])
  const [error, setError] = useState(null)
  const requestRef = useRef(null)
  const createdId = useRef(null)
  const [unavailable, setUnavailable] = useState(false)
  const [restoreFailed, setRestoreFailed] = useState(false)
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  function selectConversation(id, replace = false) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (id === null) next.delete('conversation')
      else next.set('conversation', id)
      return next
    }, { replace })
  }

  useLayoutEffect(() => () => requestRef.current?.abort(), [])

  useLayoutEffect(() => {
    // A just-created conversation already belongs to the in-flight first send.
    const alreadyOpen = !invalidId && createdId.current !== null && createdId.current === conversationId
    createdId.current = null
    if (alreadyOpen) return
    requestRef.current?.abort()
    requestRef.current = null
    // Browser history changes bypass the page handlers. Clear the prior private view before painting.
    // oxlint-disable-next-line react/set-state-in-effect
    setPending(conversationId !== null && !invalidId ? 'open' : null)
    setView('chat')
    setActive(null)
    setMessages([])
    setInput('')
    setBefore(null)
    setContext([])
    setResume({ id: '', consent: false })
    setNeedsReload(false)
    setRecovery(null)
    setError(null)
    setRestoreFailed(false)
    setUnavailable(invalidId)
    if (conversationId === null || invalidId) return

    const controller = new AbortController()
    const { signal } = controller
    requestRef.current = controller
    getConversation(request, conversationId, signal).then((data) => {
      if (signal.aborted) return
      setActive(data.conversation)
      setMessages(data.turns.flatMap((turn) => turnMessages(conversationId, turn)))
      setBefore(data.next_before)
    }).catch((failure) => {
      if (signal.aborted) return
      if (inaccessible(failure)) setUnavailable(true)
      else {
        setError(failure)
        setRestoreFailed(true)
      }
    }).finally(() => {
      if (requestRef.current !== controller) return
      requestRef.current = null
      setPending(null)
    })
    return () => controller.abort()
  }, [conversationId, invalidId, request, restoreAttempt])

  useEffect(() => {
    if (!sidebarOpen) return
    const close = (event) => { if (event.key === 'Escape') setSidebarOpen(false) }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [sidebarOpen])

  async function run(kind, operation) {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setError(null)
    setPending(kind)
    try {
      await operation(controller.signal)
    } catch (failure) {
      if (controller.signal.aborted) return
      if ((['open', 'older'].includes(kind) && inaccessible(failure)) ||
          (kind === 'send' && !resume.consent && [403, 404].includes(failure.status))) {
        // The server uses the same response for missing records and records owned by someone else.
        setUnavailable(true)
        setActive(null)
        setMessages([])
        setBefore(null)
        setResume({ id: '', consent: false })
        setRecovery(null)
        setNeedsReload(false)
        return
      }
      setError(failure)
      if (kind === 'send' && [0, 409, 502].includes(failure.status)) setNeedsReload(true)
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setPending(null)
      }
    }
  }

  function newChat() {
    if (requestRef.current) return
    if (conversationId !== null) {
      selectConversation(null)
      return
    }
    setUnavailable(false)
    setRestoreFailed(false)
    setActive(null)
    setMessages([])
    setInput('')
    setContext([])
    setBefore(null)
    setNeedsReload(false)
    setRecovery(null)
    setResume({ id: '', consent: false })
    setError(null)
    setView('chat')
  }

  function loadHistory(next = 0) {
    if (requestRef.current) return
    setView('history')
    if (!next) {
      setConversations([])
      setOffset(null)
    }
    void run('history', async (signal) => {
      const data = await listConversations(request, next, signal)
      if (signal.aborted) return
      setConversations((previous) => next
        ? [...new Map([...previous, ...data.conversations].map((item) => [item.id, item])).values()]
        : data.conversations)
      setOffset(data.next_offset)
    })
  }

  function openConversation(id, keepDraft = false) {
    return run('open', async (signal) => {
      const data = await getConversation(request, id, signal)
      if (signal.aborted) return
      setRecovery(keepDraft ? {
        changed: data.conversation.revision !== active.revision,
        conflict: error?.status === 409 || Boolean(recovery?.conflict)
      } : null)
      setActive(data.conversation)
      setMessages(data.turns.flatMap((turn) => turnMessages(id, turn)))
      setBefore(data.next_before)
      setNeedsReload(false)
      setResume({ id: '', consent: false })
      if (!keepDraft) {
        setInput('')
        setContext([])
      }
      setView('chat')
    })
  }

  function loadOlder() {
    return run('older', async (signal) => {
      const data = await getConversation(request, active.id, signal, before)
      if (signal.aborted) return
      setMessages((current) => [...data.turns.flatMap((turn) => turnMessages(active.id, turn)), ...current])
      setBefore(data.next_before)
    })
  }

  function send() {
    const draft = input.trim()
    if (!draft || draft.length > 2000 || needsReload || unavailable || restoreFailed || (conversationId && !active)) return
    return run('send', async (signal) => {
      const conversation = active ?? await createConversation(request, locale, signal)
      if (signal.aborted) return
      if (!active) {
        createdId.current = conversation.id
        selectConversation(conversation.id)
      }
      setActive(conversation)
      setRecovery(null)
      // Consent is one-use, including failed calls. A retry requires a fresh opt-in.
      setResume({ id: '', consent: false })
      const data = await sendAssistantMessage(request, conversation, draft, context, signal, resume)
      if (signal.aborted) return
      setActive({ ...conversation, revision: data.revision })
      setMessages((current) => [...current, ...turnMessages(conversation.id, data.turn)])
      setInput('')
      setContext([])
    })
  }

  function saveConversationDetails(id, edits) {
    return run('metadata', async (signal) => {
      const updated = await updateConversation(request, id, edits, signal)
      if (signal.aborted) return
      setConversations((items) => items.map((item) => item.id === id ? { ...item, ...updated } : item))
      setActive((current) => current?.id === id ? { ...current, ...updated } : current)
      if ('pinned' in edits || edits.title === null) {
        const page = await listConversations(request, 0, signal)
        if (signal.aborted) return
        setConversations(page.conversations)
        setOffset(page.next_offset)
      }
    })
  }

  function loadSaved(next = 0) {
    if (requestRef.current) return
    setView('saved')
    if (next === 0) {
      setSaved([])
      setSavedOffset(null)
    }
    return run('bookmarks', async (signal) => {
      const page = await listBookmarkedResponses(request, next, signal)
      if (signal.aborted) return
      setSaved((items) => next === 0 ? page.responses
        : [...new Map([...items, ...page.responses].map((item) => [item.id, item])).values()])
      setSavedOffset(page.nextOffset)
    })
  }

  function removeConversation(id) {
    return run('delete', async (signal) => {
      await deleteConversation(request, id, signal)
      if (signal.aborted) return
      setSaved((items) => items.filter((item) => !item.id.startsWith(id + ':')))
      if (conversationId === id) {
        selectConversation(null, true)
        setUnavailable(true)
        setActive(null)
        setMessages([])
        setContext([])
        setInput('')
        setNeedsReload(false)
        setRecovery(null)
        setResume({ id: '', consent: false })
        setBefore(null)
      }
      setConversations((items) => items.filter((item) => item.id !== id))
      setOffset((next) => next === null ? null : Math.max(0, next - 1))
    })
  }

  function toggleSaved(message) {
    if (!message) return
    return run('bookmark', async (signal) => {
      const updated = await setResponseBookmark(request, message, !message.savedAt, signal)
      if (signal.aborted) return
      setMessages((items) => items.map((item) => item.id === message.id
        ? { ...item, savedAt: updated.bookmarked_at } : item))
      if (!updated.bookmarked_at) {
        setSaved((items) => items.filter((item) => item.id !== message.id))
        setSavedOffset((next) => next === null ? null : Math.max(0, next - 1))
      }
    })
  }

  const history = conversations.map((item) => ({
    id: item.id, title: conversationTitle(item, locale, t), customTitle: item.title ?? null,
    updatedAt: item.updated_at, createdAt: item.created_at, isPinned: Boolean(item.pinned_at), pinnedAt: item.pinned_at
  }))
  const busy = pending !== null

  return (
    <div className="ai-assistant-page">
      <AssistantBackground />
      {sidebarOpen && (
        <div className="assistant-sidebar-container">
          <button type="button" className="assistant-sidebar-overlay" onClick={() => setSidebarOpen(false)}
            aria-label={t('Close navigation menu', '关闭导航菜单')} />
          <Sidebar isOpen onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {view === 'chat' && (
        <AssistantHeader onOpenHistory={() => loadHistory()} onNewChat={newChat}
          onOpenSidebar={() => setSidebarOpen(true)} isSidebarOpen={sidebarOpen} />
      )}

      <div className="assistant-api-status">
        {busy && <p role="status">{pending === 'send'
          ? t('Waiting for a reply…', '正在等待回复…') : t('Loading conversation data…', '正在处理对话数据…')}</p>}
        {unavailable && <p role="alert">{t('This conversation is unavailable. Open another from history or start a new chat.',
          '此对话无法打开。请从历史记录打开其他对话，或开始新对话。')}</p>}
        {restoreFailed && <button type="button" disabled={busy} onClick={() => setRestoreAttempt((attempt) => attempt + 1)}>
          {t('Retry loading conversation', '重试加载对话')}
        </button>}
        {error && <p role="alert">{error.status === 409
          ? t('A reply may be in progress, or this conversation may have changed. Reload to check. Your draft is still here.', '可能正在生成回复，或对话已有更新。请重新加载查看，草稿仍保留。')
          : apiErrorText(error, t)}</p>}
        {recovery && <p role="status">{recovery.changed
          ? t('New messages loaded. Review them before resending your draft.', '已加载新消息。请查看后再发送草稿。')
          : recovery.conflict
            ? t('No new reply yet. Another reply may still be in progress. Wait and check again before retrying.', '暂无新回复。可能仍在生成回复，请稍候，再检查后重试。')
            : t('No new reply is visible yet. Check the conversation before resending.', '暂未看到新回复。请先查看对话，再重新发送。')}</p>}
        {recovery?.conflict && !recovery.changed && <button type="button" disabled={busy}
          onClick={() => openConversation(active.id, true)}>
          {t('Check for a reply', '检查是否有回复')}
        </button>}
        {needsReload && active && <button type="button" disabled={busy} onClick={() => openConversation(active.id, true)}>
          {t('Reload conversation', '重新加载对话')}
        </button>}
        {needsReload && !active && <button type="button" onClick={() => { setNeedsReload(false); setError(null) }}>
          {t('Continue with draft', '继续编辑草稿')}
        </button>}
      </div>

      {view === 'chat' && !unavailable && !restoreFailed && (conversationId === null || active?.id === conversationId) && (
        <>
          {before !== null && <button type="button" className="assistant-page-more" disabled={busy} onClick={loadOlder}>
            {t('Load older messages', '加载更早消息')}
          </button>}
          {messages.length > 0 ? (
            <ChatConversation messages={messages} isLoading={pending === 'send'}
              onSaveResponse={busy ? undefined : toggleSaved} />
          ) : null}
          <main className={messages.length ? 'assistant-conversation-composer' : 'assistant-welcome-layout'}>
            {!messages.length && <AssistantWelcome />}
            {active && active.language !== locale && (
              <p className="assistant-api-note">
                {active.language === 'zh-CN'
                  ? t('This conversation replies in Simplified Chinese.', '此对话使用简体中文回复。')
                  : t('This conversation replies in English.', '此对话使用英语回复。')}
              </p>
            )}
            <fieldset className="assistant-context" disabled={busy}>
              <legend>{t('Optional context shared with the AI for this message', '为本条消息选择与 AI 共享的信息')}</legend>
              {contextOptions.map(([key, en, zh]) => (
                <label key={key}>
                  <input type="checkbox" checked={context.includes(key)} onChange={(event) => {
                    const checked = event.target.checked
                    setContext((current) => checked ? [...current, key] : current.filter((item) => item !== key))
                  }} /> {t(en, zh)}
                </label>
              ))}
            </fieldset>
            <ResumeConsent selection={resume} onChange={setResume} disabled={busy || needsReload} />
            <ChatInput input={input} onInputChange={setInput} onSend={send}
              isLoading={busy || needsReload} hasMessages={messages.length > 0} />
          </main>
        </>
      )}

      {view === 'history' && (
        <ChatHistory conversations={history} onBack={() => { if (!busy) { setError(null); setView('chat') } }}
          onNewChat={newChat} onOpenConversation={busy ? undefined : (id) => {
            if (conversationId === id) {
              setView('chat')
              setRestoreAttempt((attempt) => attempt + 1)
            } else selectConversation(id)
          }}
          onPinConversation={busy ? undefined : (id) => saveConversationDetails(id, { pinned: !conversations.find((item) => item.id === id)?.pinned_at })}
          onRenameConversation={busy ? undefined : (id, title) => saveConversationDetails(id, { title })}
          onDeleteConversation={busy ? undefined : removeConversation}
          onOpenSaved={busy ? undefined : () => loadSaved()}
          loading={pending === 'history'} loadError={Boolean(error)}
          onLoadMore={offset === null ? undefined : () => loadHistory(offset)}
          onRetry={() => loadHistory()} />
      )}

      {view === 'saved' && <SavedResponses savedResponses={saved} onBack={() => loadHistory()}
        loading={pending === 'bookmarks'} loadError={Boolean(error)}
        onLoadMore={savedOffset === null || busy ? undefined : () => loadSaved(savedOffset)}
        onRetry={busy ? undefined : () => loadSaved()}
        onRemoveResponse={busy ? undefined : (id) => toggleSaved(saved.find((item) => item.id === id))} />}
    </div>
  )
}
