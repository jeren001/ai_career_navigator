import { useLocale } from '../../../../../lib/locale.js'
import { cvLabel } from '../../../cvLabels.js'
import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { pdfFilename, printCV } from './printCV'

export default function PDFExportDialog({ title, result, width, height, onClose }) {
  const { locale } = useLocale()
  const label = (value) => cvLabel(value, locale)
  const dialog = useRef(null)
  const inProgress = useRef(false)
  const [name, setName] = useState(() => pdfFilename(title || 'CV') || 'CV.pdf')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const filename = pdfFilename(name)
  const available = result && !result.continuous

  useEffect(() => {
    const element = dialog.current
    element.showModal()
    return () => element.close()
  }, [])

  async function exportPDF(event) {
    event.preventDefault()
    if (inProgress.current || !available || !filename) return
    inProgress.current = true
    setBusy(true)
    setError('')
    setStatus('Preparing PDF…')
    try {
      await printCV({
        pages: result.pages, width, height, filename,
        onPrintClosed: () => setStatus('Print dialog closed. Check Downloads if you saved the PDF.')
      })
      setStatus(previous => previous.startsWith('Print dialog closed')
        ? previous
        : 'PDF ready. Choose Save as PDF in the print dialog.')
    } catch (failure) {
      setError(failure?.message || 'The PDF could not be prepared. Please try again.')
      setStatus('')
    } finally {
      inProgress.current = false
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialog} className="cv-pdf-dialog" aria-label={label('Export CV as PDF')} onClose={event => { if (!event.currentTarget.open) onClose() }}>
      <form onSubmit={exportPDF}>
        <h2>{label('Export CV as PDF')}</h2>
        <p>Choose <strong>Save as PDF</strong> in your browser’s print dialog. The filename below is suggested.</p>
        <label className="cv-gallery-field">
          <span>PDF filename</span>
          <input value={name} onChange={event => { setName(event.target.value); setError('') }}
            maxLength={124} required disabled={busy} aria-invalid={!filename} dir="auto" />
        </label>
        {!filename && <p role="alert">Enter a filename.</p>}
        {result?.continuous && <p role="alert">This CV could not be paginated safely. Try a larger paper size or smaller margins before exporting.</p>}
        {error && <p role="alert">{error}</p>}
        <p role="status">{!result ? 'Preparing pages…' : status || (available ? `${result.pages.length} ${result.pages.length === 1 ? 'page' : 'pages'} ready` : '')}</p>
        <div className="cv-section-actions">
          <button type="submit" className="cv-design-action" disabled={!available || !filename || busy}>
            <Download size={17} aria-hidden="true" /> {busy ? 'Preparing PDF…' : 'Save as PDF'}
          </button>
          <button type="button" className="cv-design-action" onClick={() => dialog.current.close()}>{label('Close')}</button>
        </div>
      </form>
    </dialog>
  )
}
