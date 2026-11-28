import { useEffect, useId, useRef } from 'react'

export default function InterviewConfirmation({
  title, children, confirmLabel, onConfirm, onCancel, cancelLabel = 'Cancel',
  busy = false, confirmDisabled = false, extraAction, details, error
}) {
  const dialog = useRef(null)
  const id = useId()

  useEffect(() => {
    dialog.current.showModal()
  }, [])

  function cancel() {
    if (busy) return
    dialog.current.close()
    onCancel()
  }

  return (
    <dialog ref={dialog} className="interview-dialog" aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={event => {
        event.preventDefault()
        cancel()
      }}>
      <h2 id={`${id}-title`}>{title}</h2>
      <p id={`${id}-description`}>{children}</p>
      {details}
      {error && <p className="interview-confirmation-error" role="alert">{error}</p>}
      <div className="interview-confirmation-actions">
        <button type="button" className="interview-secondary" disabled={busy} onClick={cancel}>{cancelLabel}</button>
        {extraAction}
        <button type="button" className="interview-primary" disabled={busy || confirmDisabled} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </dialog>
  )
}
