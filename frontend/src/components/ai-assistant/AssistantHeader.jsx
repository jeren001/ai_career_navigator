import { useLocale } from '../../lib/locale.js'
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
  History,
  SquarePen
} from 'lucide-react'


function AssistantHeader({
  onOpenHistory,
  onNewChat,
  onOpenSidebar,
  isSidebarOpen = false
}) {
  const { t } = useLocale()

  return (

    <header className="assistant-header">

      {/* 01. ASSISTANT BRAND */}

      <div className="assistant-brand">

        {/* Dashboard navigation menu */}

        <button
          type="button"
          className="assistant-menu-button"
          onClick={onOpenSidebar}
          aria-label={t('Open navigation menu', '打开导航菜单')}
          aria-expanded={isSidebarOpen}
          title={t('Open Menu', '打开菜单')}
        >

          <Menu size={28} strokeWidth={2} />

        </button>


        {/* Home page logo */}

        <Link
          to="/"
          className="assistant-brand-icon assistant-home-link"
          aria-label={t('Back to home page', '返回首页')}
          title={t('Back to Home', '返回首页')}
        >

          <img
              src={mascot}
              alt="AI Career Logo"
              className="assistant-brand-logo"
            />

        </Link>


        {/* Assistant title */}

        <div className="assistant-brand-text">

          <h1>{t('AI Career Assistant', 'AI 职业助手')}</h1>

          <p>{t('Ask about career choices and next steps.', '了解职业选择和下一步行动。')}</p>

        </div>

      </div>


      {/* 02. HEADER ACTIONS */}

      <div className="assistant-header-actions">

        {/* Chat history */}

        <button
          type="button"
          className="assistant-header-button"
          onClick={onOpenHistory}
          title={t('Chat History', '聊天记录')}
          aria-label={t('Open chat history', '打开聊天记录')}
        >

          <History size={21} />

        </button>


        {/* New chat */}

        <button
          type="button"
          className="assistant-header-button"
          onClick={onNewChat}
          title={t('New Chat', '新建对话')}
          aria-label={t('Start a new chat', '开始新对话')}
        >

          <SquarePen size={21} />

        </button>

      </div>

    </header>

  )

}

export default AssistantHeader
