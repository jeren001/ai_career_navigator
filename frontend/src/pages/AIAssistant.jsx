
// ==========================================
// PROJECT: AI CAREER
// PAGE: AI Assistant
// PURPOSE: Career guidance assistant
// ==========================================

import { useState, useRef, useEffect } from 'react'

// Import components
import AssistantHeader from '../components/ai-assistant/AssistantHeader'
import AssistantBackground from '../components/ai-assistant/AssistantBackground'
import AssistantWelcome from '../components/ai-assistant/AssistantWelcome'
import ChatInput from '../components/ai-assistant/ChatInput'
import ChatConversation from '../components/ai-assistant/ChatConversation'
import ChatHistory from '../components/ai-assistant/ChatHistory'
import SavedResponses from '../components/ai-assistant/SavedResponses'
import Sidebar from '../components/dashboard/Sidebar'

// Import services
import { sendAssistantMessage } from '../services/assistantService'

// Import styles
import '../styles/ai-assistant.css'


function AIAssistant() {

  // 01. STATE

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activeView, setActiveView] = useState('chat')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [savedResponses, setSavedResponses] = useState([])
const [conversations, setConversations] = useState([])
const [activeConversationId, setActiveConversationId] = useState(null)
  const requestRef = useRef(null)


  // 02. CLEANUP ON PAGE EXIT

  useEffect(() => {

    return () => {
      requestRef.current?.abort()
      requestRef.current = null
    }

  }, [])



// AUTOMATIC CONVERSATION STORAGE

useEffect(() => {

  if (!activeConversationId || messages.length === 0) {
    return
  }

  const firstUserMessage = messages.find(
    (message) => message.role === 'user'
  )

  if (!firstUserMessage) return

  const now = new Date().toISOString()

  const originalTitle = firstUserMessage.content
    .replace(/\s+/g, ' ')
    .trim()

  const title = originalTitle.length > 50
    ? originalTitle.slice(0, 50) + '...'
    : originalTitle

  setConversations((previousConversations) => {

    const existingConversation = previousConversations.find(
      (conversation) =>
        conversation.id === activeConversationId
    )

    // Update existing conversation

    if (existingConversation) {

      return previousConversations.map(
        (conversation) =>
          conversation.id === activeConversationId
            ? {
                ...conversation,
                messages: [...messages],
                updatedAt: now
              }
            : conversation
      )

    }

    // Create new conversation

    return [
      {
        id: activeConversationId,
        title,
        messages: [...messages],
        isPinned: false,
        createdAt: now,
        updatedAt: now
      },
      ...previousConversations
    ]

  })

}, [messages, activeConversationId])


  // 03. CHAT HISTORY NAVIGATION

function handleOpenHistory() {

  setActiveView('history')

}

function handleBackToChat() {

  setActiveView('chat')

}



// OPEN EXISTING CONVERSATION

function handleOpenConversation(conversationId) {

  // Find the selected conversation

  const conversation = conversations.find(
    (item) => item.id === conversationId
  )

  if (!conversation) return


  // Keep the current conversation if already selected

  if (conversationId === activeConversationId) {

    setActiveView('chat')
    return

  }


  // Cancel any previous pending request

  requestRef.current?.abort()
  requestRef.current = null


  // Restore selected conversation

  setActiveConversationId(conversation.id)
  setMessages([...conversation.messages])
  setInput('')
  setIsLoading(false)
  setActiveView('chat')

}


  
// 04. START NEW CHAT

function handleNewChat() {

  requestRef.current?.abort()
  requestRef.current = null

  setActiveConversationId(null)
  setMessages([])
  setInput('')
  setIsLoading(false)
  setActiveView('chat')

}



  // 05. SEND MESSAGE

  async function handleSendMessage() {

    const message = input.trim()

    if (!message || isLoading || requestRef.current) return

    // Create a conversation ID for the first message

if (!activeConversationId) {
  setActiveConversationId(crypto.randomUUID())
}


    const newMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    }

    const updatedMessages = [
      ...messages,
      newMessage
    ]

    const controller = new AbortController()

    requestRef.current = controller

    setMessages(updatedMessages)
    setInput('')
    setIsLoading(true)

    try {

      const response = await sendAssistantMessage(
        updatedMessages,
        { signal: controller.signal }
      )

      if (
        !controller.signal.aborted &&
        requestRef.current === controller
      ) {

        setMessages((previousMessages) => [
          ...previousMessages,
          response
        ])

      }

    } catch (error) {

      if (
        !controller.signal.aborted &&
        requestRef.current === controller
      ) {

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            createdAt: new Date().toISOString()
          }
        ])

      }

    } finally {

      if (requestRef.current === controller) {

        requestRef.current = null
        setIsLoading(false)

      }

    }

  }


  // 06. SAVE OR REMOVE ASSISTANT RESPONSE

  function handleSaveResponse(message) {

    if (message.role !== 'assistant') return

    setSavedResponses((previousResponses) => {

      const alreadySaved = previousResponses.some(
        (response) => response.id === message.id
      )

      // Remove an already saved response

      if (alreadySaved) {

        return previousResponses.filter(
          (response) => response.id !== message.id
        )

      }

      // Save a new response

      return [
        ...previousResponses,
        {
          ...message,
          savedAt: new Date().toISOString()
        }
      ]

    })

  }


  // 07. EDIT MESSAGE AND GENERATE NEW RESPONSE

  async function handleEditMessage(messageId, content) {

    const editedContent = content.trim()

    if (!editedContent || isLoading || requestRef.current) {
      return
    }


    // Find original message

    const messageIndex = messages.findIndex(
      (message) =>
        message.id === messageId &&
        message.role === 'user'
    )

    if (messageIndex === -1) return


    // Update original message

    const editedMessage = {
      ...messages[messageIndex],
      content: editedContent,
      editedAt: new Date().toISOString()
    }


    // Remove subsequent messages

    const updatedMessages = [
      ...messages.slice(0, messageIndex),
      editedMessage
    ]


    // Prepare request

    const controller = new AbortController()

    requestRef.current = controller

    setMessages(updatedMessages)
    setIsLoading(true)


    // Generate new response

    try {

      const response = await sendAssistantMessage(
        updatedMessages,
        { signal: controller.signal }
      )

      if (
        !controller.signal.aborted &&
        requestRef.current === controller
      ) {

        setMessages((previousMessages) => [
          ...previousMessages,
          response
        ])

      }

    } catch (error) {

      if (
        !controller.signal.aborted &&
        requestRef.current === controller
      ) {

        setMessages((previousMessages) => [
          ...previousMessages,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Something went wrong. Please try again.',
            createdAt: new Date().toISOString()
          }
        ])

      }

    } finally {

      if (requestRef.current === controller) {

        requestRef.current = null
        setIsLoading(false)

      }

    }

  }




// 08. REGENERATE ASSISTANT RESPONSE

async function handleRegenerateResponse(messageId) {

  if (isLoading || requestRef.current) return


  // Find the selected assistant response

  const messageIndex = messages.findIndex(
    (message) =>
      message.id === messageId &&
      message.role === 'assistant'
  )

  if (messageIndex === -1) return

  // Only regenerate the latest response

  if (messageIndex !== messages.length - 1) return


  // Preserve previous conversation context

  const updatedMessages = messages.slice(0, messageIndex)


  // Prepare request

  const controller = new AbortController()

  requestRef.current = controller

  setMessages(updatedMessages)
  setIsLoading(true)


  // Generate a new response

  try {

    const response = await sendAssistantMessage(
      updatedMessages,
      { signal: controller.signal }
    )

    if (
      !controller.signal.aborted &&
      requestRef.current === controller
    ) {

      setMessages((previousMessages) => [
        ...previousMessages,
        response
      ])

    }

  } catch (error) {

    // Restore original response if regeneration fails

    if (
      !controller.signal.aborted &&
      requestRef.current === controller
    ) {

      setMessages(messages)

      console.error('Failed to regenerate response:', error)

    }

  } finally {

    if (requestRef.current === controller) {

      requestRef.current = null
      setIsLoading(false)

    }

  }

}




// 09. PIN OR UNPIN CONVERSATION

function handlePinConversation(conversationId) {

  setConversations((previousConversations) =>

    previousConversations.map((conversation) =>

      conversation.id === conversationId

        ? {
            ...conversation,
            isPinned: !conversation.isPinned
          }

        : conversation

    )

  )

}


// RENAME CONVERSATION

function handleRenameConversation(conversationId, newTitle) {

  const title = newTitle.trim()

  // Validate conversation title

  if (!title || title.length > 80) return

  // Update conversation title

  setConversations((previousConversations) =>

    previousConversations.map((conversation) =>

      conversation.id === conversationId

        ? {
            ...conversation,
            title: title
          }

        : conversation

    )

  )

}


// DELETE CONVERSATION

function handleDeleteConversation(conversationId) {

  // Reset active conversation if it is being deleted
  if (conversationId === activeConversationId) {
    requestRef.current?.abort()
    requestRef.current = null

    setActiveConversationId(null)
    setMessages([])
    setInput('')
    setIsLoading(false)
  }

  // Remove conversation from history
  setConversations((previousConversations) =>
    previousConversations.filter(
      (conversation) => conversation.id !== conversationId
    )
  )

}


  // OPEN SAVED RESPONSES

  function handleOpenSavedResponses() {
    setActiveView('saved')
  }

  // REMOVE SAVED RESPONSE

  function handleRemoveSavedResponse(responseId) {
    setSavedResponses((previousResponses) =>
      previousResponses.filter((response) => response.id !== responseId)
    )
  }

  // OPEN DASHBOARD SIDEBAR

function handleOpenSidebar() {

  setIsSidebarOpen(true)

}


// CLOSE DASHBOARD SIDEBAR

function handleCloseSidebar() {

  setIsSidebarOpen(false)

}

// CLOSE SIDEBAR WITH ESCAPE KEY

useEffect(() => {

  if (!isSidebarOpen) return

  function handleKeyDown(event) {

    if (event.key === 'Escape') {

      setIsSidebarOpen(false)

    }

  }

  document.addEventListener('keydown', handleKeyDown)

  return () => {

    document.removeEventListener('keydown', handleKeyDown)

  }

}, [isSidebarOpen])

  // 10. PAGE LAYOUT

  return (
    <div className="ai-assistant-page">

      <AssistantBackground />
{/* DASHBOARD NAVIGATION SIDEBAR */}

{isSidebarOpen && (

  <div className="assistant-sidebar-container">

    {/* Background overlay */}

    <button
      type="button"
      className="assistant-sidebar-overlay"
      onClick={handleCloseSidebar}
      aria-label="Close navigation menu"
    />

    {/* Reusable dashboard sidebar */}

    <Sidebar
      isOpen={isSidebarOpen}
      onClose={handleCloseSidebar}
    />

  </div>

)}
      {activeView === 'chat' && (

  <AssistantHeader
    onOpenHistory={handleOpenHistory}
    onNewChat={handleNewChat}
    onOpenSidebar={handleOpenSidebar}
    isSidebarOpen={isSidebarOpen}
  />

)}

      {/* WELCOME SCREEN */}

      {activeView === 'chat' && messages.length === 0 && (

        <main className="assistant-welcome-layout">

          <AssistantWelcome />

          <ChatInput
            input={input}
            onInputChange={setInput}
            onSend={handleSendMessage}
            isLoading={isLoading}
            hasMessages={false}
          />

        </main>

      )}


      {/* ACTIVE CONVERSATION */}

      {activeView === 'chat' && messages.length > 0 && (

        <>

          <ChatConversation
            messages={messages}
            isLoading={isLoading}
            savedResponses={savedResponses}
            onSaveResponse={handleSaveResponse}
            onEditMessage={handleEditMessage}
            onRegenerateResponse={handleRegenerateResponse}
          />

          <ChatInput
            input={input}
            onInputChange={setInput}
            onSend={handleSendMessage}
            isLoading={isLoading}
            hasMessages={true}
          />

        </>

      )}


      {/* CHAT HISTORY */}

{activeView === 'history' && (

  <ChatHistory
    conversations={conversations}
    onBack={handleBackToChat}
    onNewChat={handleNewChat}
    onOpenConversation={handleOpenConversation}
    onPinConversation={handlePinConversation}
    onRenameConversation={handleRenameConversation}
    onDeleteConversation={handleDeleteConversation}
    onOpenSaved={handleOpenSavedResponses}
  />

)}






    {/* SAVED RESPONSES */}

      {activeView === 'saved' && (
        <SavedResponses
          savedResponses={savedResponses}
          onBack={handleOpenHistory}
          onRemoveResponse={handleRemoveSavedResponse}
        />
      )}

    </div>
  )
}

export default AIAssistant
