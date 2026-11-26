
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
  onDeleteConversation
}) {

  // 01. STATE

  const [searchQuery, setSearchQuery] = useState('')
const [renamingConversation, setRenamingConversation] = useState(null)
const [deletingConversation, setDeletingConversation] = useState(null)
  // 02. SEARCH AND SORT CONVERSATIONS

  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase()

  // Filter conversations by title and message content

  const filteredConversations = conversations.filter(
    (conversation) => {

      const matchesTitle = conversation.title
        .toLowerCase()
        .includes(normalizedQuery)

      const matchesMessages = conversation.messages.some(
        (message) =>
          message.content
            .toLowerCase()
            .includes(normalizedQuery)
      )

      return matchesTitle || matchesMessages

    }
  )

  // Sort by most recent update

  const sortedConversations = [...filteredConversations].sort(
    (a, b) =>
      new Date(b.updatedAt) - new Date(a.updatedAt)
  )


  // 03. GROUP CONVERSATIONS

  const pinnedConversations = sortedConversations.filter(
    (conversation) => conversation.isPinned
  )

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
          aria-label="Back to chat"
          title="Back"
        >
          <ArrowLeft size={23} />
        </button>

        <div className="chat-history-heading">

          <h1>Chat History</h1>

          <p>Continue your career conversations.</p>

        </div>

        <button
          type="button"
          className="history-icon-button"
          onClick={onNewChat}
          aria-label="New chat"
          title="New Chat"
        >
          <SquarePen size={22} />
        </button>

      </header>


      {/* SEARCH BAR */}

      <div className="history-search">

        <Search size={20} />

        <input
          type="search"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(event.target.value)
          }
          aria-label="Search conversations"
        />

      </div>


      {/* CONVERSATION LIST */}

      <div className="history-conversations">

        {filteredConversations.length === 0 ? (

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
                ? 'No conversations yet'
                : 'No conversations found'}
            </h2>

            <p>
              {conversations.length === 0
                ? 'Your career conversations will appear here.'
                : 'Try a different search term.'}
            </p>

          </div>

        ) : (

          <>

            {/* PINNED CONVERSATIONS */}

            {pinnedConversations.length > 0 && (

              <div className="history-group">

                <h2 className="history-group-title">
                  Pinned
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
                  Recent
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


      {/* SAVED RESPONSES */}

      <button
        type="button"
        className="history-saved-button"
        onClick={onOpenSaved}
        disabled={!onOpenSaved}
      >

        <Bookmark size={21} />

        <span>Saved Responses</span>

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