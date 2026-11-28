import { useEffect, useId, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'

export default function DeleteNotificationsDialog({ onConfirm, onClose }) {
  const dialog = useRef(null)
  const cancel = useRef(null)
  const submitting = useRef(false)
  const titleId = useId()
  const descriptionId = useId()
  const [error, setError] = useState('')

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    cancel.current.focus()
    return () => { if (element.open) element.close() }
  }, [])

  function confirm(event) {
    event.preventDefault()
    if (submitting.current || !dialog.current.open) return

    submitting.current = true
    if (onConfirm()) {
      dialog.current.close('deleted')
    } else {
      submitting.current = false
      setError('Notifications could not be deleted. Please try again.')
    }
  }

  return (
    <dialog
      ref={dialog}
      className="notification-delete-dialog"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={event => { if (event.key === 'Escape') event.stopPropagation() }}
      onClose={event => {
        if (!event.currentTarget.open) onClose(event.currentTarget.returnValue === 'deleted')
      }}
    >
      <form onSubmit={confirm}>
        <span className="notification-delete-dialog-icon"><Trash2 size={19} aria-hidden="true" /></span>
        <h2 id={titleId}>Delete all notifications?</h2>
        <p id={descriptionId}>This will remove all your notifications. This action cannot be undone.</p>
        <p className="notification-delete-dialog-error" role="alert">{error}</p>
        <div className="notification-delete-dialog-actions">
          <button ref={cancel} type="button" onClick={() => dialog.current.close()}>Cancel</button>
          <button type="submit" className="notification-delete-dialog-confirm">Delete all</button>
        </div>
      </form>
    </dialog>
  )
}
