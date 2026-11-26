
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

  return (
    <div className="assistant-message-actions">

      {/* 01. USER ACTIONS */}

      {isUser ? (

        <button
          type="button"
          className="assistant-action-button"
          onClick={onEdit}
          disabled={isLoading || !onEdit}
          title="Edit message"
          aria-label="Edit message"
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
            title={isCopied ? 'Copied' : 'Copy response'}
            aria-label={isCopied ? 'Copied' : 'Copy response'}
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
            title={isSaved ? 'Remove saved response' : 'Save response'}
            aria-label={isSaved ? 'Remove saved response' : 'Save response'}
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
            title="Regenerate response"
            aria-label="Regenerate response"
          >
            <RefreshCw size={17} />
          </button>

        </>

      )}

    </div>
  )
}

export default MessageActions
