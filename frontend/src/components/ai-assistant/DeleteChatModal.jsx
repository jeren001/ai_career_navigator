// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Delete Chat Modal
// PURPOSE: Confirm conversation deletion
// ==========================================

import { useEffect, useRef } from 'react'
import { Trash2, X } from 'lucide-react'


function DeleteChatModal({
  conversation,
  onClose,
  onDelete
}) {

  // 01. REFERENCES

  const dialogRef = useRef(null)
  const cancelRef = useRef(null)


  // 02. OPEN MODAL

  useEffect(() => {

    const dialog = dialogRef.current

    dialog.showModal()

    cancelRef.current?.focus()

    return () => {
      dialog.close()
    }

  }, [])


  // 03. CONFIRM DELETION

  function handleDelete() {

    onDelete(conversation.id)

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
      className="delete-chat-dialog"
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby="delete-chat-title"
      aria-describedby="delete-chat-description"
    >

      <div className="delete-chat-modal">

        {/* MODAL HEADER */}

        <div className="delete-modal-header">

          <div className="delete-modal-icon">

            <Trash2 size={24} />

          </div>

          <button
            type="button"
            className="delete-modal-close"
            onClick={onClose}
            aria-label="Close delete dialog"
          >

            <X size={21} />

          </button>

        </div>


        {/* TITLE AND DESCRIPTION */}

        <div className="delete-modal-heading">

          <h2 id="delete-chat-title">
            Delete Chat?
          </h2>

          <p id="delete-chat-description">
            Are you sure you want to delete this
            conversation? This action cannot be undone.
          </p>

        </div>


        {/* CONVERSATION NAME */}

        <div className="delete-modal-conversation">

          {conversation.title}

        </div>


        {/* ACTION BUTTONS */}

        <div className="delete-modal-actions">

          <button
            ref={cancelRef}
            type="button"
            className="delete-modal-cancel"
            onClick={onClose}
          >

            Cancel

          </button>

          <button
            type="button"
            className="delete-modal-confirm"
            onClick={handleDelete}
          >

            Delete Chat

          </button>

        </div>

      </div>

    </dialog>

  )

}

export default DeleteChatModal