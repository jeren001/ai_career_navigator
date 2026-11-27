import { useLocale } from '../../lib/locale.js'

// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Loading Indicator
// PURPOSE: Display assistant loading animation
// ==========================================

import { Bot } from 'lucide-react'

function LoadingIndicator() {
  const { t } = useLocale()

  return (
    <div
      className="assistant-message-row assistant-message-ai"
      role="status"
      aria-label={t('Assistant is thinking', '助手正在思考')}
    >

      {/* 01. ASSISTANT AVATAR */}

      <div className="assistant-message-avatar">
        <Bot size={22} strokeWidth={2} />
      </div>


      {/* 02. ANIMATED LOADING DOTS */}

      <div className="assistant-loading-bubble">

        <span className="assistant-loading-dot" />
        <span className="assistant-loading-dot" />
        <span className="assistant-loading-dot" />

      </div>

    </div>
  )
}

export default LoadingIndicator
