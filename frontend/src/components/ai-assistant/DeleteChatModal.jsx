import { useLocale } from '../../lib/locale.js'
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
  const { t } = useLocale()

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
            aria-label={t('Close delete dialog', '关闭删除对话框')}
          >

            <X size={21} />

          </button>

        </div>


        {/* TITLE AND DESCRIPTION */}

        <div className="delete-modal-heading">

          <h2 id="delete-chat-title">
            {t('Delete Chat?', '删除对话？')}
          </h2>

          <p id="delete-chat-description">
            {t('Delete this conversation and its saved messages permanently?', '要永久删除此对话及其中的消息吗？')}
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

            {t('Cancel', '取消')}

          </button>

          <button
            type="button"
            className="delete-modal-confirm"
            onClick={handleDelete}
          >

            {t('Delete Chat', '删除对话')}

          </button>

        </div>

      </div>

    </dialog>

  )

}

export default DeleteChatModal
