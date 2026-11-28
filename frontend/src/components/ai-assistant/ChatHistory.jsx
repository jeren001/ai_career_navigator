import { useLocale } from '../../lib/locale.js'

// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Chat History
// PURPOSE: Display previous conversations
// ==========================================

import { useState } from 'react'

import {
  ArrowLeft,
  Search,
  SquarePen,
  Bookmark,
  ChevronRight,
  MessageSquare
} from 'lucide-react'

// Import components
import ChatHistoryItem from './ChatHistoryItem'
import RenameChatModal from './RenameChatModal'
// Import styles
import '../../styles/chat-history.css'
import DeleteChatModal from './DeleteChatModal'

function ChatHistory({
  conversations = [],
  onBack,
  onNewChat,
  onOpenSaved,
  onOpenConversation,
  onPinConversation,
  onRenameConversation,
  onDeleteConversation, loading, loadError, onLoadMore, onRetry
}) {
  const { t } = useLocale()

  // 01. STATE

  const [searchQuery, setSearchQuery] = useState('')
const [renamingConversation, setRenamingConversation] = useState(null)
const [deletingConversation, setDeletingConversation] = useState(null)
  // 02. SEARCH AND SORT CONVERSATIONS

  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase()

  const filteredConversations = conversations.filter(({ title }) =>
    title.toLowerCase().includes(normalizedQuery)
  )

  // Sort by most recent update

  const sortedConversations = [...filteredConversations].sort(
    (a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
  )


  // 03. GROUP CONVERSATIONS

  const pinnedConversations = sortedConversations.filter((conversation) => conversation.isPinned)
    .sort((a, b) => b.pinnedAt.localeCompare(a.pinnedAt))

  const recentConversations = sortedConversations.filter(
    (conversation) => !conversation.isPinned
  )

  // RENAME CONVERSATION HANDLERS

function handleOpenRename(conversationId) {

  const conversation = conversations.find(
    (item) => item.id === conversationId
  )

  if (!conversation) return

  setRenamingConversation(conversation)

}


function handleCloseRename() {

  setRenamingConversation(null)

}


function handleSaveRename(conversationId, newTitle) {

  if (!onRenameConversation) return

  onRenameConversation(conversationId, newTitle)

  setRenamingConversation(null)

}




// DELETE CONVERSATION HANDLERS

function handleOpenDelete(conversationId) {

  const conversation = conversations.find(
    (item) => item.id === conversationId
  )

  if (!conversation) return

  setDeletingConversation(conversation)

}


function handleCloseDelete() {

  setDeletingConversation(null)

}


function handleConfirmDelete(conversationId) {

  if (!onDeleteConversation) return

  onDeleteConversation(conversationId)

  setDeletingConversation(null)

}


  // 04. PAGE LAYOUT

  return (

    <div className="chat-history">

      {/* HEADER */}

      <header className="chat-history-header">

        <button
          type="button"
          className="history-icon-button"
          onClick={onBack}
          aria-label={t('Back to chat', '返回聊天')}
          title={t('Back', '返回')}
        >
          <ArrowLeft size={23} />
        </button>

        <div className="chat-history-heading">

          <h1>{t('Chat History', '聊天记录')}</h1>

          <p>{t('Continue your career conversations.', '继续你的职业对话。')}</p>

        </div>

        <button
          type="button"
          className="history-icon-button"
          onClick={onNewChat}
          aria-label={t('New chat', '新建对话')}
          title={t('New Chat', '新建对话')}
        >
          <SquarePen size={22} />
        </button>

      </header>


      {/* SEARCH BAR */}

      <div className="history-search">

        <Search size={20} />

        <input
          type="search"
          placeholder={t('Search conversations...', '搜索对话…')}
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(event.target.value)
          }
          aria-label={t('Search conversations', '搜索对话')}
        />

      </div>


      {/* CONVERSATION LIST */}

      <div className="history-conversations">

        {filteredConversations.length === 0 ? (!loading && !loadError && (

          /* EMPTY STATE */

          <div className="history-empty-state">

            <div className="history-empty-icon">

              {conversations.length === 0 ? (
                <MessageSquare size={32} />
              ) : (
                <Search size={32} />
              )}

            </div>

            <h2>
              {conversations.length === 0
                ? t('No conversations yet', '暂无对话')
                : t('No conversations found', '未找到对话')}
            </h2>

            <p>
              {conversations.length === 0
                ? t('Your career conversations will appear here.', '你的职业对话将显示在这里。')
                : t('Try a different search term.', '请尝试其他关键词。')}
            </p>

          </div>

        )) : (

          <>

            {/* PINNED CONVERSATIONS */}

            {pinnedConversations.length > 0 && (

              <div className="history-group">

                <h2 className="history-group-title">
                  {t('Pinned', '已置顶')}
                </h2>

                {pinnedConversations.map((conversation) => (

                  <ChatHistoryItem
  key={conversation.id}
  conversation={conversation}
  onOpen={onOpenConversation}
  onPin={onPinConversation}
  onRename={handleOpenRename}
  onDelete={handleOpenDelete}
/>

                ))}

              </div>

            )}


            {/* RECENT CONVERSATIONS */}

            {recentConversations.length > 0 && (

              <div className="history-group">

                <h2 className="history-group-title">
                  {t('Recent', '最近')}
                </h2>

                {recentConversations.map((conversation) => (

                  <ChatHistoryItem
  key={conversation.id}
  conversation={conversation}
  onOpen={onOpenConversation}
  onPin={onPinConversation}
  onRename={handleOpenRename}
  onDelete={handleOpenDelete}

/>
                ))}

              </div>

            )}

          </>

        )}

      </div>


      {onLoadMore && <button type="button" className="assistant-page-more" disabled={loading} onClick={onLoadMore}>
        {t('Load older conversations', '加载更早对话')}
      </button>}
      {loadError && !conversations.length && <button type="button" className="assistant-page-more" onClick={onRetry}>
        {t('Retry', '重试')}
      </button>}
      <p className="assistant-api-note">
        {t('Search covers loaded conversation titles.', '搜索仅涵盖已加载的对话标题。')}
      </p>
      {/* SAVED RESPONSES */}

      <button
        type="button"
        className="history-saved-button"
        onClick={onOpenSaved}
        disabled={!onOpenSaved}
      >

        <Bookmark size={21} />

        <span>{t('Saved Responses', '已收藏回复')}</span>

        <ChevronRight size={19} />

            </button>


      {/* RENAME CHAT MODAL */}

      {renamingConversation && (

        <RenameChatModal
          conversation={renamingConversation}
          onClose={handleCloseRename}
          onSave={handleSaveRename}
        />

      )}
      {/* DELETE CHAT MODAL */}

{deletingConversation && (

  <DeleteChatModal
    conversation={deletingConversation}
    onClose={handleCloseDelete}
    onDelete={handleConfirmDelete}
  />

)}

    </div>

  )

}

export default ChatHistory
