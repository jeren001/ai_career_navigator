// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Assistant Header
// PURPOSE: AI Assistant navigation
// ==========================================

// Import navigation tools
import { Link } from 'react-router-dom'
import mascot from '../../assets/mascot.png'

// Import navigation icons
import {
  Menu,
  Bot,
  History,
  SquarePen
} from 'lucide-react'


function AssistantHeader({
  onOpenHistory,
  onNewChat,
  onOpenSidebar,
  isSidebarOpen = false
}) {

  return (

    <header className="assistant-header">

      {/* 01. ASSISTANT BRAND */}

      <div className="assistant-brand">

        {/* Dashboard navigation menu */}

        <button
          type="button"
          className="assistant-menu-button"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
          aria-expanded={isSidebarOpen}
          title="Open Menu"
        >

          <Menu size={28} strokeWidth={2} />

        </button>


        {/* Home page logo */}

        <Link
          to="/"
          className="assistant-brand-icon assistant-home-link"
          aria-label="Back to home page"
          title="Back to Home"
        >

          <img
              src={mascot}
              alt="AI Career Logo"
              className="assistant-brand-logo"
            />

        </Link>


        {/* Assistant title */}

        <div className="assistant-brand-text">

          <h1>AI Career Assistant</h1>

          <p>Your AI partner for career growth.</p>

        </div>

      </div>


      {/* 02. HEADER ACTIONS */}

      <div className="assistant-header-actions">

        {/* Chat history */}

        <button
          type="button"
          className="assistant-header-button"
          onClick={onOpenHistory}
          title="Chat History"
          aria-label="Open chat history"
        >

          <History size={21} />

        </button>


        {/* New chat */}

        <button
          type="button"
          className="assistant-header-button"
          onClick={onNewChat}
          title="New Chat"
          aria-label="Start a new chat"
        >

          <SquarePen size={21} />

        </button>

      </div>

    </header>

  )

}

export default AssistantHeader