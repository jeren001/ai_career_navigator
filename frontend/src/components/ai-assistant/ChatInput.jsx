import { useLocale } from '../../lib/locale.js'

// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Chat Input
// PURPOSE: Assistant message input
// ==========================================

import { useEffect, useRef } from 'react'
import { Send, Sparkles } from 'lucide-react'

function ChatInput({
  input,
  onInputChange,
  onSend,
  isLoading,
  hasMessages
}) {
  const { t } = useLocale()

  const textareaRef = useRef(null)

  // 01. AUTOMATIC TEXTAREA HEIGHT

  useEffect(() => {
    const textarea = textareaRef.current

    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height =
        `${Math.min(textarea.scrollHeight, 160)}px`
    }
  }, [input])


  // 02. SUBMIT MESSAGE

  function handleSubmit(event) {
    event.preventDefault()

    if (!input.trim() || isLoading) return

    onSend()
  }


  // 03. KEYBOARD CONTROLS

  function handleKeyDown(event) {

    if (event.nativeEvent.isComposing) return

    if (event.key !== 'Enter') return

    // Shift + Enter creates a new line
    if (event.shiftKey) return

    // Enter sends the message
    event.preventDefault()

    if (input.trim() && !isLoading) {
      onSend()
    }
  }


  // 04. COMPONENT LAYOUT

  return (
    <div
      className={`assistant-input-section ${
        hasMessages ? 'assistant-input-active' : ''
      }`}
    >

      {/* MESSAGE INPUT */}

      <form
        className="assistant-input-box"
        onSubmit={handleSubmit}
      >

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) =>
            onInputChange(event.target.value)
          }
          onKeyDown={handleKeyDown}
          placeholder={t('Ask me anything about your career...', '请输入你的职业问题…')}
          aria-label={t('Your message', '你的消息')}
          rows={1}
          maxLength={2000}
          readOnly={isLoading}
          className="assistant-textarea"
        />

        {/* SEND BUTTON */}

        <button
          type="submit"
          className="assistant-send-button"
          disabled={!input.trim() || isLoading}
          aria-label={t('Send message', '发送消息')}
          title={t('Send message', '发送消息')}
        >
          <Send size={22} strokeWidth={2} />
        </button>

      </form>

      {/* WELCOME SLOGAN */}

      {!hasMessages && (
        <div className="assistant-input-slogan">

          <Sparkles size={16} />

          <span>{t('Avoid sharing confidential information.', '请勿分享机密信息。')}</span>

          <Sparkles size={16} />

        </div>
      )}

    </div>
  )
}

export default ChatInput
