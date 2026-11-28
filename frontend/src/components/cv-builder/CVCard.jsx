import { useLocale } from '../../lib/locale.js'
import { cvLabel } from './cvLabels.js'
import { CircleCheck, Download, FileType, Pencil } from 'lucide-react'
import CVThumbnail from './my-cvs/CVThumbnail'
import CVActionsMenu from './my-cvs/CVActionsMenu'

export default function CVCard({ cv, onEdit, onDownload, onAction, compact = false }) {
  const { locale } = useLocale()
  const label = (value) => cvLabel(value, locale)
  const date = new Date(cv.updatedAt ?? cv.createdAt)
  const formattedDate = Number.isNaN(date.getTime()) ? label('Not available') : date.toLocaleDateString(locale, {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const draft = cv.status === 'draft'
  const StatusIcon = draft ? Pencil : CircleCheck
  const title = cv.title || 'Untitled CV'
  const editLabel = draft && !compact ? label('Resume draft') : label('Edit')

  return (
    <article className="cv-card">
      <CVThumbnail cv={cv} />
      <div className="cv-card-information">
        <div className="cv-card-details">
          <h3 className="cv-card-title" dir="auto">{title}</h3>
          <p className="cv-card-template">{cv.template || 'Template unavailable'}</p>
        </div>
        <CVActionsMenu cv={cv} onAction={onAction} onEdit={compact ? onEdit : undefined}
          onDownload={compact ? onDownload : undefined} />
      </div>
      <div className="cv-card-meta">
        <span className="cv-card-status" data-draft={draft}>
          {compact && <StatusIcon size={12} aria-hidden="true" />}
          {draft ? label('Draft') : label('Completed')}
        </span>
        <p className="cv-card-date">Edited {formattedDate}</p>
      </div>
      <div className="cv-card-actions">
        <button type="button" className="cv-card-edit-button" onClick={() => onEdit(cv.id)}
          aria-label={compact ? `Edit ${draft ? 'draft ' : ''}${title}` : undefined}
          title={compact ? (draft ? 'Continue editing draft' : label('Edit CV')) : undefined}>
          <Pencil size={compact ? 16 : 17} aria-hidden="true" /> {editLabel}
        </button>
        <button type="button" className="cv-card-download-button" onClick={() => onDownload(cv.id, 'pdf')}
          aria-label={`Download ${title} as PDF`} title={label('Download PDF')}>
          <Download size={compact ? 16 : 20} aria-hidden="true" />
        </button>
        <button type="button" className="cv-card-download-button" onClick={() => onDownload(cv.id, 'docx')}
          aria-label={`Download ${title} as DOCX`} title={label('Download DOCX')}>
          <FileType size={compact ? 16 : 20} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
