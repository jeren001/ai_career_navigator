
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Rename Chat Modal
// PURPOSE: Rename existing conversations
// ==========================================

import { useState, useRef, useEffect } from 'react'
import { Pencil, X } from 'lucide-react'


function RenameChatModal({
  conversation,
  onClose,
  onSave
}) {

  // 01. STATE AND REFERENCES

  const [title, setTitle] = useState(conversation.title)

  const dialogRef = useRef(null)
  const inputRef = useRef(null)

  const maxLength = 80


  // 02. OPEN MODAL AND FOCUS INPUT

  useEffect(() => {

    const dialog = dialogRef.current

    dialog.showModal()

    inputRef.current?.focus()
    inputRef.current?.select()

    return () => {
      dialog.close()
    }

  }, [])


  // 03. SAVE CONVERSATION TITLE

  function handleSubmit(event) {

    event.preventDefault()

    const newTitle = title.trim()

    if (!newTitle || newTitle.length > maxLength) {
      return
    }

    onSave(conversation.id, newTitle)

  }


  // 04. CLOSE WITH ESCAPE

  function handleCancel(event) {

    event.preventDefault()

    onClose()

  }


  // 05. CLOSE ON BACKDROP CLICK

  function handleBackdropClick(event) {

    if (event.target === event.currentTarget) {
      onClose()
    }

  }


  // 06. MODAL LAYOUT

  return (

    <dialog
      ref={dialogRef}
      className="rename-chat-dialog"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="rename-chat-title"
    >

      <div className="rename-chat-modal">

        {/* MODAL HEADER */}

        <div className="rename-modal-header">

          <div className="rename-modal-icon">

            <Pencil size={23} />

          </div>

          <button
            type="button"
            className="rename-modal-close"
            onClick={onClose}
            aria-label="Close rename dialog"
          >

            <X size={21} />

          </button>

        </div>


        {/* TITLE AND DESCRIPTION */}

        <div className="rename-modal-heading">

          <h2 id="rename-chat-title">
            Rename Chat
          </h2>

          <p>
            Give your conversation a new name.
          </p>

        </div>


        {/* RENAME FORM */}

        <form
          className="rename-modal-form"
          onSubmit={handleSubmit}
        >

          <label htmlFor="conversation-title">
            Conversation name
          </label>

          <input
            ref={inputRef}
            id="conversation-title"
            className="rename-modal-input"
            type="text"
            value={title}
            maxLength={maxLength}
            onChange={(event) =>
              setTitle(event.target.value)
            }
            placeholder="Enter conversation name"
            required
          />


          {/* CHARACTER COUNTER */}

          <span className="rename-modal-counter">

            {title.length}/{maxLength}

          </span>


          {/* ACTION BUTTONS */}

          <div className="rename-modal-actions">

            <button
              type="button"
              className="rename-modal-cancel"
              onClick={onClose}
            >

              Cancel

            </button>

            <button
              type="submit"
              className="rename-modal-save"
              disabled={
                !title.trim() ||
                title.trim() === conversation.title ||
                title.length > maxLength
              }
            >

              Save

            </button>

          </div>

        </form>

      </div>

    </dialog>

  )

}

export default RenameChatModal
