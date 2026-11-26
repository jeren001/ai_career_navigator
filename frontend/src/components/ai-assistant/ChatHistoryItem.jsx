
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Chat History Item
// PURPOSE: Display conversation and options
// ==========================================

import { useState, useEffect, useRef } from 'react'

import {
  MessageSquare,
  MoreHorizontal,
  Pin,
  PinOff,
  Pencil,
  Trash2
} from 'lucide-react'


function ChatHistoryItem({
  conversation,
  onOpen,
  onPin,
  onRename,
  onDelete
}) {

  // 01. STATE AND REFERENCES

  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const menuRef = useRef(null)
  const menuButtonRef = useRef(null)


  // 02. FORMAT CONVERSATION DATE

  const formattedDate = new Date(
    conversation.updatedAt
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })


  // 03. CLOSE MENU ON OUTSIDE CLICK

  useEffect(() => {

    if (!isMenuOpen) return

    function handleOutsideClick(event) {

      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsMenuOpen(false)
      }

    }

    function handleKeyDown(event) {

      if (event.key === 'Escape') {
        setIsMenuOpen(false)
        menuButtonRef.current?.focus()
      }

    }

    document.addEventListener(
      'pointerdown',
      handleOutsideClick
    )

    document.addEventListener(
      'keydown',
      handleKeyDown
    )

    return () => {

      document.removeEventListener(
        'pointerdown',
        handleOutsideClick
      )

      document.removeEventListener(
        'keydown',
        handleKeyDown
      )

    }

  }, [isMenuOpen])


  // 04. HANDLE MENU ACTION

  function handleAction(action) {

    setIsMenuOpen(false)

    action?.(conversation.id)

  }


  // 05. COMPONENT LAYOUT

  return (

    <div className="history-item">

      {/* OPEN CONVERSATION */}

      <button
        type="button"
        className="history-item-main"
        onClick={() => onOpen?.(conversation.id)}
        disabled={!onOpen}
      >

        <div className="history-item-icon">

          <MessageSquare size={22} />

        </div>

        <div className="history-item-content">

          <h3>{conversation.title}</h3>

          <p>{formattedDate}</p>

        </div>

      </button>


      {/* PINNED INDICATOR */}

      {conversation.isPinned && (

        <Pin
          size={17}
          className="history-item-pin"
          aria-label="Pinned conversation"
        />

      )}


      {/* CONVERSATION OPTIONS */}

      <div
        className="history-menu-container"
        ref={menuRef}
      >

        <button
          ref={menuButtonRef}
          type="button"
          className="history-item-menu"
          onClick={() =>
            setIsMenuOpen((previous) => !previous)
          }
          aria-expanded={isMenuOpen}
          aria-label={`Options for ${conversation.title}`}
          title="Conversation options"
        >

          <MoreHorizontal size={22} />

        </button>


        {/* OPTIONS DROPDOWN */}

        {isMenuOpen && (

          <div className="history-options-menu">

            {/* PIN CHAT */}

            <button
              type="button"
              className="history-option"
              onClick={() => handleAction(onPin)}
              disabled={!onPin}
            >

              {conversation.isPinned ? (
                <PinOff size={17} />
              ) : (
                <Pin size={17} />
              )}

              <span>
                {conversation.isPinned
                  ? 'Unpin Chat'
                  : 'Pin Chat'}
              </span>

            </button>


            {/* RENAME CHAT */}

            <button
              type="button"
              className="history-option"
              onClick={() => handleAction(onRename)}
              disabled={!onRename}
            >

              <Pencil size={17} />

              <span>Rename Chat</span>

            </button>


            <div className="history-menu-divider" />


            {/* DELETE CHAT */}

            <button
              type="button"
              className="history-option history-option-delete"
              onClick={() => handleAction(onDelete)}
              disabled={!onDelete}
            >

              <Trash2 size={17} />

              <span>Delete Chat</span>

            </button>

          </div>

        )}

      </div>

    </div>

  )

}

export default ChatHistoryItem
