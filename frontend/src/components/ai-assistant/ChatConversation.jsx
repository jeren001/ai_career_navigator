
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Chat Conversation
// PURPOSE: Display and manage chat messages
// ==========================================

import { useEffect, useRef } from 'react'

import ChatMessage from './ChatMessage'
import LoadingIndicator from './LoadingIndicator'


function ChatConversation({
  messages,
  isLoading,
  savedResponses = [],
  onSaveResponse,
  onEditMessage,
  onRegenerateResponse
}) {

  // 01. REFERENCES

  const conversationRef = useRef(null)


  // 02. AUTOMATIC SCROLL

  useEffect(() => {

    const conversation = conversationRef.current

    if (conversation) {

      conversation.scrollTop = conversation.scrollHeight

    }

  }, [messages, isLoading])


  // 03. CONVERSATION LAYOUT

  return (

    <div
      ref={conversationRef}
      className="assistant-conversation"
      aria-label="Chat conversation"
    >

      <div
        className="assistant-conversation-content"
        role="log"
        aria-live="polite"
      >

        {messages.map((message, index) => (

          <ChatMessage
            key={message.id}
            message={message}
            isLoading={isLoading}
            isSaved={savedResponses.some(
              (response) => response.id === message.id
            )}
            onSaveResponse={onSaveResponse}
            onEditMessage={onEditMessage}
            onRegenerateResponse={
              message.role === 'assistant' &&
              index === messages.length - 1
                ? onRegenerateResponse
                : undefined
            }
          />

        ))}


        {/* LOADING INDICATOR */}

        {isLoading && <LoadingIndicator />}

      </div>

    </div>

  )

}

export default ChatConversation
