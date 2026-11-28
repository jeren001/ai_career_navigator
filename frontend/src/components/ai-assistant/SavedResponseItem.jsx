import { useLocale } from '../../lib/locale.js'
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Saved Response Item
// PURPOSE: Display an individual saved response
// ==========================================

import { useState, useEffect } from 'react'

// Import icons
import {
  Bookmark,
  Copy,
  Check,
  Trash2
} from 'lucide-react'


function SavedResponseItem({
  response,
  onRemove
}) {
  const { t, locale } = useLocale()

  // 01. STATE

  const [isCopied, setIsCopied] = useState(false)
  const [copyError, setCopyError] = useState(false)


  // 02. FORMAT SAVED DATE

  const formattedDate = new Date(
    response.savedAt
  ).toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })


  // 03. COPY RESPONSE

  async function handleCopy() {

    try {

      await navigator.clipboard.writeText(
        response.content
      )

      setIsCopied(true)
      setCopyError(false)

    } catch (error) {

      setCopyError(true)

      console.error('Failed to copy response:', error)

    }

  }


  // 04. RESET COPY STATUS

  useEffect(() => {

    if (!isCopied && !copyError) return

    const timeout = setTimeout(() => {

      setIsCopied(false)
      setCopyError(false)

    }, 2000)

    return () => clearTimeout(timeout)

  }, [isCopied, copyError])


  // 05. REMOVE SAVED RESPONSE

  function handleRemove() {

    onRemove?.(response.id)

  }


  // 06. COMPONENT LAYOUT

  return (

    <article className="saved-response-item">

      {/* RESPONSE HEADER */}

      <div className="saved-response-header">

        <div className="saved-response-icon">

          <Bookmark size={21} />

        </div>

        <h2>{t('AI Career Assistant', 'AI 职业助手')}</h2>

      </div>


      {/* RESPONSE CONTENT */}

      <div className="saved-response-content">

        {response.content}

      </div>


      {/* RESPONSE FOOTER */}

      <div className="saved-response-footer">

        <span className="saved-response-date">

          {formattedDate}

        </span>


        {/* RESPONSE ACTIONS */}

        <div className="saved-response-actions">

          <button
            type="button"
            className={`saved-response-action ${
              isCopied ? 'is-copied' : ''
            }`}
            onClick={handleCopy}
            aria-label={t('Copy response', '复制回复')}
            title={isCopied ? t('Copied!', '已复制！') : t('Copy response', '复制回复')}
          >

            {isCopied
              ? <Check size={19} />
              : <Copy size={19} />
            }

          </button>


          <button
            type="button"
            className="saved-response-action saved-response-remove"
            onClick={handleRemove}
            disabled={!onRemove}
            aria-label={t('Remove saved response', '取消收藏')}
            title={t('Remove saved response', '取消收藏')}
          >

            <Trash2 size={19} />

          </button>

        </div>

      </div>


      {/* COPY FEEDBACK */}

      {isCopied && (

        <span role="status" className="saved-copy-status">

          {t('Response copied!', '已复制回复！')}

        </span>

      )}


      {copyError && (

        <span role="alert" className="saved-copy-error">

          {t('Unable to copy response. Please try again.', '无法复制回复，请重试。')}

        </span>

      )}

    </article>

  )

}

export default SavedResponseItem
