import { useLocale } from '../../../lib/locale.js'
import { cvLabel } from '../cvLabels.js'
import { useEffect, useRef, useState } from 'react'
import { Copy, Download, FileType, Eye, MoreVertical, Pencil, Sparkles, Trash2 } from 'lucide-react'

const actions = [
  ['view', 'View CV', Eye],
  ['rename', 'Rename CV', Pencil],
  ['duplicate', 'Duplicate CV', Copy],
  ['analyze', 'Analyze CV', Sparkles],
  ['optimize', 'Target-role advice', Sparkles],
  ['delete', 'Delete CV', Trash2]
]

export default function CVActionsMenu({ cv, onAction, onEdit, onDownload }) {
  const { locale } = useLocale()
  const translate = (value) => cvLabel(value, locale)
  const menu = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const element = menu.current
    function closeOutside(event) {
      if (element.open && !element.contains(event.target)) element.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])

  const menuActions = [
    actions[0],
    ...(onEdit ? [['edit', cv.status === 'draft' ? translate('Resume draft') : 'Edit', Pencil, () => onEdit(cv.id)]] : []),
    ...(onDownload ? [
      ['pdf', 'Download PDF', Download, () => onDownload(cv.id, 'pdf')],
      ['docx', 'Download DOCX', FileType, () => onDownload(cv.id, 'docx')]
    ] : []),
    ...(cv.fileType ? [['original', 'Download original', Download], ['extraction', 'Review extracted fields', Eye]] : []),
    ...actions.slice(1)
  ]

  return (
    <details ref={menu} className="cv-card-menu" onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => {
      if (event.key === 'Escape' && menu.current.open) {
        event.preventDefault()
        menu.current.open = false
        menu.current.querySelector('summary').focus()
      }
    }}>
      <summary className="cv-card-menu-button" aria-label={`More options for ${cv.title}`} title={translate('More options')}>
        <MoreVertical size={20} aria-hidden="true" />
      </summary>
      <div className="cv-card-menu-content">
        {menuActions.map(([id, label, Icon, run]) => (
          <button key={id} type="button" onClick={() => {
            menu.current.open = false
            menu.current.querySelector('summary').focus()
            if (run) run()
            else onAction(cv.id, id)
          }}>
            <Icon size={16} aria-hidden="true" /> {translate(label)}
          </button>
        ))}
      </div>
    </details>
  )
}
