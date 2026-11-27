import { useEffect, useRef, useState } from 'react'
import { Copy, Eye, MoreVertical, Pencil, Sparkles, Trash2 } from 'lucide-react'

const actions = [
  ['view', 'View CV', Eye],
  ['rename', 'Rename CV', Pencil],
  ['duplicate', 'Duplicate CV', Copy],
  ['analyze', 'Analyze CV · Coming soon', Sparkles],
  ['optimize', 'Optimize CV · Coming soon', Sparkles],
  ['delete', 'Delete CV', Trash2]
]

export default function CVActionsMenu({ cv, onAction }) {
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

  return (
    <details ref={menu} className="cv-card-menu" onToggle={event => setOpen(event.currentTarget.open)} onKeyDown={event => {
      if (event.key === 'Escape' && menu.current.open) {
        event.preventDefault()
        menu.current.open = false
        menu.current.querySelector('summary').focus()
      }
    }}>
      <summary className="cv-card-menu-button" aria-label={`More options for ${cv.title}`} title="More options">
        <MoreVertical size={20} aria-hidden="true" />
      </summary>
      <div className="cv-card-menu-content">
        {actions.map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => {
            menu.current.open = false
            menu.current.querySelector('summary').focus()
            onAction(cv.id, id)
          }}>
            <Icon size={16} aria-hidden="true" /> {label}
          </button>
        ))}
      </div>
    </details>
  )
}
