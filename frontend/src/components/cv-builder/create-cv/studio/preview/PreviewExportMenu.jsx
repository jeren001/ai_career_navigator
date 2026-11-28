import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Download, FileText } from 'lucide-react'

export default function PreviewExportMenu({ onExport }) {
  const menu = useRef(null)
  const trigger = useRef(null)
  const [open, setOpen] = useState(false)

  function closeAndRestoreFocus() {
    menu.current.open = false
    trigger.current.focus()
  }

  useEffect(() => {
    if (!open) return
    const disclosure = menu.current
    function closeOutside(event) {
      if (!disclosure.contains(event.target)) disclosure.open = false
    }

    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  return (
    <details ref={menu} className="cv-preview-export" onToggle={event => setOpen(event.currentTarget.open)}
      onKeyDown={event => {
        if (event.key === 'Escape' && menu.current.open) {
          event.preventDefault()
          event.stopPropagation()
          closeAndRestoreFocus()
        }
      }}>
      <summary ref={trigger} className="cv-preview-export-trigger">
        <Download size={16} aria-hidden="true" />
        Export
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="cv-preview-export-options">
        {['pdf', 'docx'].map(format => (
          <button key={format} type="button" onClick={() => {
            closeAndRestoreFocus()
            onExport(format)
          }}>
            <FileText size={16} aria-hidden="true" /> Download {format.toUpperCase()}
          </button>
        ))}
      </div>
    </details>
  )
}
