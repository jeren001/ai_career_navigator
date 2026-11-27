import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { exportFilename } from './exportFilename'

export default function DOCXExportDialog({ cvData, title, onClose }) {
  const dialog = useRef(null)
  const request = useRef(null)
  const [name, setName] = useState(() => exportFilename(title || 'CV', 'docx') || 'CV.docx')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const filename = exportFilename(name, 'docx')

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => {
      request.current?.abort()
      element.close()
    }
  }, [])

  async function download(event) {
    event.preventDefault()
    if (!filename || request.current) return
    const controller = new AbortController()
    request.current = controller
    setBusy(true)
    setError('')
    setStatus('Preparing Word document…')

    try {
      const { exportDOCX } = await import('./exportDOCX')
      if (controller.signal.aborted) return
      if (await exportDOCX(cvData, filename, controller.signal)) {
        setStatus('DOCX download initiated. Check your browser’s downloads.')
      }
    } catch (failure) {
      if (!controller.signal.aborted) {
        setStatus('')
        setError(failure instanceof Error && failure.message.startsWith('The profile photo')
          ? failure.message
          : 'The Word document could not be prepared. Please try again.')
      }
    } finally {
      request.current = null
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function close() {
    request.current?.abort()
    dialog.current.close()
  }

  return (
    <dialog ref={dialog} className="cv-pdf-dialog" aria-label="Export CV as DOCX"
      onCancel={() => request.current?.abort()}
      onClose={event => { if (!event.currentTarget.open) onClose() }}>
      <form onSubmit={download}>
        <h2>Export CV as DOCX</h2>
        <p>Word uses editable text and its own pagination. Line wrapping, page breaks, and some header, date, and column spacing may differ from Live Preview.</p>
        <label className="cv-gallery-field">
          <span>DOCX filename</span>
          <input value={name} onChange={event => { setName(event.target.value); setError('') }}
            maxLength={125} required disabled={busy} aria-invalid={!filename} dir="auto" />
        </label>
        {!filename && <p role="alert">Enter a filename.</p>}
        {error && <p role="alert">{error}</p>}
        {status && <p role="status">{status}</p>}
        <div className="cv-section-actions">
          <button type="submit" className="cv-design-action" disabled={!filename || busy}>
            <Download size={17} aria-hidden="true" /> {busy ? 'Preparing DOCX…' : 'Download DOCX'}
          </button>
          <button type="button" className="cv-design-action" onClick={close}>{status.startsWith('DOCX download') ? 'Close' : 'Cancel'}</button>
        </div>
      </form>
    </dialog>
  )
}
