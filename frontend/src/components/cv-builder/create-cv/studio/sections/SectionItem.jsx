import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Pencil, Trash2 } from 'lucide-react'

export default function SectionItem({ item, index, count, onEdit, onToggle, onRemove, move, drag }) {
  const required = item.id === 'personal'
  return (
    <li className="cv-section-item" data-drop-target={drag?.target === item.id || undefined}
      onDragOver={drag?.over} onDrop={drag?.drop}>
      <div className="cv-section-item-label">
        {!required && count > 1 && (
          <span draggable className="cv-section-handle" aria-hidden="true" onDragStart={drag.start} onDragEnd={drag.end}>
            <GripVertical size={18} />
          </span>
        )}
        <strong dir="auto">{item.title}</strong>
        {(required || item.hidden) && <span>{required ? 'Required' : 'Hidden'}</span>}
      </div>
      <div className="cv-section-actions">
        <button type="button" aria-label={`Edit ${item.title}`} onClick={onEdit}><Pencil size={17} aria-hidden="true" /></button>
        {!required && (
          <>
            <button type="button" aria-label={`${item.hidden ? 'Show' : 'Hide'} ${item.title}`} onClick={onToggle}>
              {item.hidden ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
            </button>
            <button type="button" aria-label={`Move ${item.title} up`} disabled={index === 0} onClick={() => move(-1)}><ArrowUp size={17} aria-hidden="true" /></button>
            <button type="button" aria-label={`Move ${item.title} down`} disabled={index === count - 1} onClick={() => move(1)}><ArrowDown size={17} aria-hidden="true" /></button>
            <button type="button" aria-label={`${item.custom ? 'Delete' : 'Remove'} ${item.title}`} onClick={onRemove}><Trash2 size={17} aria-hidden="true" /></button>
          </>
        )}
      </div>
    </li>
  )
}
