
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Chat Message
// PURPOSE: Display and edit chat messages
// ==========================================

import { useState, useRef, useEffect } from 'react'
import { Bot } from 'lucide-react'
import MessageActions from './MessageActions'

function ChatMessage({
  message,
  isSaved = false,
  isLoading = false,
  onSaveResponse,
  onEditMessage,
  onRegenerateResponse
}) {

  // 01. STATE

  const isUser = message.role === 'user'

  const [isCopied, setIsCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState('')

  const copyTimeoutRef = useRef(null)


  // 02. CLEANUP

  useEffect(() => {

    return () => {
      clearTimeout(copyTimeoutRef.current)
    }

  }, [])


  // 03. COPY RESPONSE

  async function handleCopy() {

    setCopyError('')

    try {

      await navigator.clipboard.writeText(message.content)

      setIsCopied(true)

      clearTimeout(copyTimeoutRef.current)

      copyTimeoutRef.current = setTimeout(() => {
        setIsCopied(false)
      }, 2000)

    } catch (error) {

      setIsCopied(false)
      setCopyError('Unable to copy. Please try again.')

      console.error('Failed to copy response:', error)

    }
  }


  // 04. START EDITING

  function handleStartEdit() {

    if (!isUser || isLoading) return

    setEditedContent(message.content)
    setIsEditing(true)
  }


  // 05. CANCEL EDITING

  function handleCancelEdit() {

    setEditedContent('')
    setIsEditing(false)
  }


  // 06. SUBMIT EDITED MESSAGE

  function handleSubmitEdit(event) {

    event.preventDefault()

    const content = editedContent.trim()

    if (!content || isLoading || !onEditMessage) return

    if (content === message.content) {
      handleCancelEdit()
      return
    }

    onEditMessage(message.id, content)

    setIsEditing(false)
    setEditedContent('')
  }


  // 07. MESSAGE LAYOUT

  return (
    <div
      className={`assistant-message-row ${
        isUser
          ? 'assistant-message-user'
          : 'assistant-message-ai'
      }`}
    >

      {/* ASSISTANT AVATAR */}

      {!isUser && (
        <div className="assistant-message-avatar">
          <Bot size={22} strokeWidth={2} />
        </div>
      )}


      {/* MESSAGE CONTENT */}

      <div
        className={`assistant-message-content ${
          isEditing ? 'assistant-message-editing' : ''
        }`}
      >

        {isEditing ? (

          /* EDIT MESSAGE FORM */

          <form
            className="assistant-edit-form"
            onSubmit={handleSubmitEdit}
          >

            <textarea
              className="assistant-edit-textarea"
              value={editedContent}
              onChange={(event) =>
                setEditedContent(event.target.value)
              }
              aria-label="Edit your message"
              rows={3}
              autoFocus
            />

            <div className="assistant-edit-actions">

              <button
                type="button"
                className="assistant-edit-cancel"
                onClick={handleCancelEdit}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="assistant-edit-send"
                disabled={
                  !editedContent.trim() ||
                  isLoading ||
                  !onEditMessage
                }
              >
                Send
              </button>

            </div>

          </form>

        ) : (

          <>

            {/* ORIGINAL MESSAGE */}

            <div className="assistant-message-bubble">
              {message.content}
            </div>


            {/* MESSAGE ACTIONS */}

            
<MessageActions
  isUser={isUser}
  isCopied={isCopied}
  isSaved={isSaved}
  isLoading={isLoading}

  onCopy={!isUser ? handleCopy : undefined}

  onSave={
    !isUser && onSaveResponse
      ? () => onSaveResponse(message)
      : undefined
  }

  onEdit={
    isUser ? handleStartEdit : undefined
  }

  onRegenerate={
    !isUser && onRegenerateResponse
      ? () => onRegenerateResponse(message.id)
      : undefined
  }
/>


          </>

        )}

        {copyError && (
          <span
            className="assistant-copy-error"
            role="alert"
          >
            {copyError}
          </span>
        )}

      </div>

    </div>
  )
}

export default ChatMessage
