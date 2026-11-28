import { useLocale } from '../../lib/locale.js'
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Saved Responses
// PURPOSE: Display and search saved AI responses
// ==========================================

import { useState } from 'react'

// Import icons
import {
  ArrowLeft,
  Search,
  Bookmark
} from 'lucide-react'

// Import components
import SavedResponseItem from './SavedResponseItem'

// Import styles
import '../../styles/saved-responses.css'


function SavedResponses({
  savedResponses = [],
  onBack,
  onRemoveResponse, loading, loadError, onLoadMore, onRetry
}) {
  const { t } = useLocale()

  // 01. STATE

  const [searchQuery, setSearchQuery] = useState('')


  // 02. FILTER SAVED RESPONSES

  const normalizedQuery = searchQuery
    .trim()
    .toLowerCase()

  const filteredResponses = savedResponses.filter(
    (response) =>
      response.content
        .toLowerCase()
        .includes(normalizedQuery)
  )


  // 03. SORT SAVED RESPONSES

  const sortedResponses = [...filteredResponses].sort(
    (a, b) =>
      new Date(b.savedAt) - new Date(a.savedAt)
  )


  // 04. PAGE LAYOUT

  return (

    <div className="saved-responses-page">

      {/* PAGE HEADER */}

      <header className="saved-page-header">

        <button
          type="button"
          className="saved-back-button"
          onClick={onBack}
          aria-label={t('Back to chat history', '返回聊天记录')}
          title={t('Back', '返回')}
        >

          <ArrowLeft size={23} />

        </button>


        <div className="saved-page-heading">

          <h1>{t('Saved Responses', '已收藏回复')}</h1>

          <p>{t('Your saved insights, all in one place.', '集中查看收藏的回复。')}</p>

        </div>


        <div className="saved-page-icon">

          <Bookmark size={24} />

        </div>

      </header>


      {/* SEARCH BAR */}

      <div className="saved-search">

        <Search size={20} />

        <input
          type="search"
          placeholder={t('Search saved responses...', '搜索已收藏回复…')}
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(event.target.value)
          }
          aria-label={t('Search saved responses', '搜索已收藏回复')}
        />

      </div>


      {/* SAVED RESPONSES LIST */}

      {loadError && !savedResponses.length && onRetry && <button type="button" className="assistant-page-more" onClick={onRetry}>
        {t('Retry', '重试')}
      </button>}
      <div className="saved-responses-list">

        {sortedResponses.length === 0 ? (!loading && !loadError && (

          <div className="saved-empty-state">

            <div className="saved-empty-icon">

              {savedResponses.length === 0
                ? <Bookmark size={34} />
                : <Search size={34} />
              }

            </div>


            <h2>

              {savedResponses.length === 0
                ? t('No saved responses yet', '暂无收藏回复')
                : t('No responses found', '未找到回复')
              }

            </h2>


            <p>

              {savedResponses.length === 0
                ? t('Save helpful AI responses to find them here later.', '收藏有用的回复，以便稍后查看。')
                : t('Try a different search term.', '请尝试其他关键词。')
              }

            </p>

          </div>

        )) : (

          sortedResponses.map((response) => (

            <SavedResponseItem
              key={response.id}
              response={response}
              onRemove={onRemoveResponse}
            />

          ))

        )}

      </div>

      {onLoadMore && <button type="button" className="assistant-page-more" onClick={onLoadMore}>
        {t('Load older saved responses', '加载更早的收藏回复')}
      </button>}
    </div>

  )

}

export default SavedResponses
