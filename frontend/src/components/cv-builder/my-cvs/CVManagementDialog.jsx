import { useEffect, useId, useRef, useState } from 'react'

export function CVDialog({ label, onClose, className = '', children, canClose = true }) {
  const dialog = useRef(null)
  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  return (
    <dialog ref={dialog} className={`cv-pdf-dialog ${className}`} aria-label={label}
      onCancel={event => { if (!canClose) event.preventDefault() }}
      onClose={event => { if (!event.currentTarget.open) onClose() }}>
      {children}
    </dialog>
  )
}

export default function CVManagementDialog({ cv, action, onClose, onConfirm }) {
  const rename = action === 'rename'
  const title = rename ? 'Rename CV' : 'Delete CV'
  const fieldId = useId()
  const [name, setName] = useState(cv.title || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lock = useRef(false)

  async function submit(event) {
    event.preventDefault()
    if (lock.current) return
    if (rename && (!name.trim() || name.trim().length > 120)) {
      setError('Enter a CV name between 1 and 120 characters.')
      return
    }

    lock.current = true
    setBusy(true)
    setError('')
    try {
      await onConfirm(action, cv.id, name.trim())
      onClose()
    } catch (failure) {
      setError(failure?.message || 'This change could not be saved. Please try again.')
    } finally {
      lock.current = false
      setBusy(false)
    }
  }

  return (
    <CVDialog label={title} onClose={onClose} canClose={!busy}>
      <form onSubmit={submit}>
        <h2>{title}</h2>
        {rename ? (
          <label className="cv-gallery-field" htmlFor={fieldId}>
            <span>CV name</span>
            <input id={fieldId} dir="auto" value={name} maxLength={120} disabled={busy} onChange={event => setName(event.target.value)} />
          </label>
        ) : (
          <p>Permanently delete <strong dir="auto">{cv.title}</strong> from this workspace?</p>
        )}
        {error && <p role="alert">{error}</p>}
        <div className="cv-section-actions">
          <button type="button" className="cv-design-action" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="cv-design-action" data-destructive={!rename || undefined} disabled={busy}>
            {busy ? 'Saving…' : rename ? 'Save name' : 'Delete CV'}
          </button>
        </div>
      </form>
    </CVDialog>
  )
}
