import { useLocale } from '../../lib/locale.js'

// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Message Actions
// PURPOSE: Display message action buttons
// ==========================================

import {
  Copy,
  Bookmark,
  RefreshCw,
  Pencil,
  Check
} from 'lucide-react'

function MessageActions({
  isUser,
  isCopied = false,
  isSaved = false,
  isLoading = false,
  onCopy,
  onSave,
  onRegenerate,
  onEdit
}) {
  const { t } = useLocale()

  return (
    <div className="assistant-message-actions">

      {/* 01. USER ACTIONS */}

      {isUser ? (

        <button
          type="button"
          className="assistant-action-button"
          onClick={onEdit}
          disabled={isLoading || !onEdit}
          title={t('Edit message', '编辑消息')}
          aria-label={t('Edit message', '编辑消息')}
        >
          <Pencil size={17} />
        </button>

      ) : (

        <>

          {/* 02. COPY RESPONSE */}

          <button
            type="button"
            className="assistant-action-button"
            onClick={onCopy}
            disabled={!onCopy}
            title={isCopied ? t('Copied', '已复制') : t('Copy response', '复制回复')}
            aria-label={isCopied ? t('Copied', '已复制') : t('Copy response', '复制回复')}
          >
            {isCopied ? (
              <Check size={17} />
            ) : (
              <Copy size={17} />
            )}
          </button>


          {/* 03. SAVE RESPONSE */}

          <button
            type="button"
            className={`assistant-action-button ${
              isSaved ? 'assistant-action-saved' : ''
            }`}
            onClick={onSave}
            disabled={!onSave}
            title={isSaved ? t('Remove saved response', '取消收藏') : t('Save response', '收藏回复')}
            aria-label={isSaved ? t('Remove saved response', '取消收藏') : t('Save response', '收藏回复')}
            aria-pressed={isSaved}
          >
            <Bookmark
              size={17}
              fill={isSaved ? 'currentColor' : 'none'}
            />
          </button>


          {/* 04. REGENERATE RESPONSE */}

          <button
            type="button"
            className="assistant-action-button"
            onClick={onRegenerate}
            disabled={isLoading || !onRegenerate}
            title={t('Regenerate response', '重新生成回复')}
            aria-label={t('Regenerate response', '重新生成回复')}
          >
            <RefreshCw size={17} />
          </button>

        </>

      )}

    </div>
  )
}

export default MessageActions
