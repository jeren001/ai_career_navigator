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
  onRemoveResponse
}) {

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
          aria-label="Back to chat history"
          title="Back"
        >

          <ArrowLeft size={23} />

        </button>


        <div className="saved-page-heading">

          <h1>Saved Responses</h1>

          <p>Your saved insights, all in one place.</p>

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
          placeholder="Search saved responses..."
          value={searchQuery}
          onChange={(event) =>
            setSearchQuery(event.target.value)
          }
          aria-label="Search saved responses"
        />

      </div>


      {/* SAVED RESPONSES LIST */}

      <div className="saved-responses-list">

        {sortedResponses.length === 0 ? (

          <div className="saved-empty-state">

            <div className="saved-empty-icon">

              {savedResponses.length === 0
                ? <Bookmark size={34} />
                : <Search size={34} />
              }

            </div>


            <h2>

              {savedResponses.length === 0
                ? 'No saved responses yet'
                : 'No responses found'
              }

            </h2>


            <p>

              {savedResponses.length === 0
                ? 'Save helpful AI responses to find them here later.'
                : 'Try a different search term.'
              }

            </p>

          </div>

        ) : (

          sortedResponses.map((response) => (

            <SavedResponseItem
              key={response.id}
              response={response}
              onRemove={onRemoveResponse}
            />

          ))

        )}

      </div>

    </div>

  )

}

export default SavedResponses