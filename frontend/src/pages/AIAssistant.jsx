import { useEffect, useRef, useState } from 'react'
import AssistantHeader from '../components/ai-assistant/AssistantHeader'
import AssistantBackground from '../components/ai-assistant/AssistantBackground'
import AssistantWelcome from '../components/ai-assistant/AssistantWelcome'
import ChatInput from '../components/ai-assistant/ChatInput'
import ChatConversation from '../components/ai-assistant/ChatConversation'
import ChatHistory from '../components/ai-assistant/ChatHistory'
import SavedResponses from '../components/ai-assistant/SavedResponses'
import Sidebar from '../components/dashboard/Sidebar'
import { apiErrorText, useLocale } from '../lib/locale.js'
import { useSession } from '../session/session.js'
import {
  createConversation, deleteConversation, getConversation, listConversations, sendAssistantMessage, turnMessages
} from '../services/assistantService.js'
import '../styles/ai-assistant.css'

const contextOptions = [
  ['profile', 'Profile', '个人资料'], ['assessment', 'Assessment', '测评'],
  ['career_match', 'Career Match', '职业匹配'], ['skills', 'Skills', '技能'],
  ['roadmap', 'Roadmap', '路线图'], ['practice', 'Practice history', '练习记录']
]

export default function AIAssistant() {
  const { request } = useSession()
  const { locale, t } = useLocale()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(null)
  const [view, setView] = useState('chat')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [sessionDetails, setSessionDetails] = useState({})
  const [saved, setSaved] = useState([])
  const [offset, setOffset] = useState(null)
  const [before, setBefore] = useState(null)
  const [needsReload, setNeedsReload] = useState(false)
  const [context, setContext] = useState([])
  const [error, setError] = useState(null)
  const requestRef = useRef(null)

  useEffect(() => () => requestRef.current?.abort(), [])
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
      setError(failure)
      if (kind === 'send' && [0, 409, 502].includes(failure.status)) setNeedsReload(true)
    } finally {
      if (!controller.signal.aborted) {
        requestRef.current = null
        setPending(null)
      }
    }
  }

  function newChat() {
    if (requestRef.current) return
    setActive(null)
    setMessages([])
    setInput('')
    setContext([])
    setBefore(null)
    setNeedsReload(false)
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
      setActive(data.conversation)
      setMessages(data.turns.flatMap((turn) => turnMessages(id, turn)))
      setBefore(data.next_before)
      setNeedsReload(false)
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
    if (!draft || draft.length > 2000 || needsReload) return
    return run('send', async (signal) => {
      const conversation = active ?? await createConversation(request, locale, signal)
      if (signal.aborted) return
      setActive(conversation)
      const data = await sendAssistantMessage(request, conversation, draft, context, signal)
      if (signal.aborted) return
      setActive({ ...conversation, revision: data.revision })
      setMessages((current) => [...current, ...turnMessages(conversation.id, data.turn)])
      setInput('')
      setContext([])
    })
  }

  function updateSessionDetails(id, edits) {
    setSessionDetails((previous) => ({ ...previous, [id]: { ...previous[id], ...edits } }))
  }

  function removeConversation(id) {
    return run('delete', async (signal) => {
      await deleteConversation(request, id, signal)
      if (signal.aborted) return
      setSaved((items) => items.filter((item) => !item.id.startsWith(id + ':')))
      if (active?.id === id) {
        setActive(null)
        setMessages([])
        setContext([])
        setInput('')
        setNeedsReload(false)
        setBefore(null)
      }
      setConversations((items) => items.filter((item) => item.id !== id))
      setOffset((next) => next === null ? null : Math.max(0, next - 1))
    })
  }

  function toggleSaved(message) {
    setSaved((items) => items.some(({ id }) => id === message.id)
      ? items.filter(({ id }) => id !== message.id)
      : [...items, { ...message, savedAt: new Date().toISOString() }])
  }

  const history = conversations.map((item) => {
    const details = sessionDetails[item.id]
    return {
      id: item.id, title: details?.title || item.preview || t('Untitled conversation', '未命名对话'),
      updatedAt: item.updated_at, createdAt: item.created_at,
      isPinned: Boolean(details?.isPinned)
    }
  })
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
        {error && <p role="alert">{error.status === 409
          ? t('This conversation changed. Reload it before sending again.', '对话已更新，请重新加载后再发送。')
          : apiErrorText(error, t)}</p>}
        {needsReload && active && <button type="button" disabled={busy} onClick={() => openConversation(active.id, true)}>
          {t('Reload conversation', '重新加载对话')}
        </button>}
        {needsReload && !active && <button type="button" onClick={() => { setNeedsReload(false); setError(null) }}>
          {t('Continue with draft', '继续编辑草稿')}
        </button>}
      </div>

      {view === 'chat' && (
        <>
          {before !== null && <button type="button" className="assistant-page-more" disabled={busy} onClick={loadOlder}>
            {t('Load older messages', '加载更早消息')}
          </button>}
          {messages.length > 0 ? (
            <ChatConversation messages={messages} isLoading={pending === 'send'}
              savedResponses={saved} onSaveResponse={toggleSaved} />
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
            <ChatInput input={input} onInputChange={setInput} onSend={send}
              isLoading={busy || needsReload} hasMessages={messages.length > 0} />
          </main>
        </>
      )}

      {view === 'history' && (
        <ChatHistory conversations={history} onBack={() => { if (!busy) { setError(null); setView('chat') } }}
          onNewChat={newChat} onOpenConversation={busy ? undefined : openConversation}
          onPinConversation={busy ? undefined : (id) => updateSessionDetails(id, { isPinned: !sessionDetails[id]?.isPinned })}
          onRenameConversation={busy ? undefined : (id, title) => updateSessionDetails(id, { title })}
          onDeleteConversation={busy ? undefined : removeConversation}
          onOpenSaved={() => { if (!busy) { setError(null); setView('saved') } }}
          loading={pending === 'history'} loadError={Boolean(error)}
          onLoadMore={offset === null ? undefined : () => loadHistory(offset)}
          onRetry={() => loadHistory()} />
      )}

      {view === 'saved' && <SavedResponses savedResponses={saved} onBack={() => loadHistory()}
        onRemoveResponse={(id) => setSaved((items) => items.filter((item) => item.id !== id))} />}
    </div>
  )
}
