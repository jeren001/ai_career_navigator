import { Download, FileType, Pencil } from 'lucide-react'
import CVThumbnail from './my-cvs/CVThumbnail'
import CVActionsMenu from './my-cvs/CVActionsMenu'

export default function CVCard({ cv, onEdit, onDownload, onAction }) {
  const date = new Date(cv.updatedAt ?? cv.createdAt)
  const formattedDate = Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric'
  })
  const draft = cv.status === 'draft'

  return (
    <article className="cv-card">
      <CVThumbnail cv={cv} />
      <div className="cv-card-information">
        <div className="cv-card-details">
          <h3 className="cv-card-title" dir="auto">{cv.title || 'Untitled CV'}</h3>
          <p className="cv-card-template">{cv.template || 'Template unavailable'}</p>
        </div>
        <CVActionsMenu cv={cv} onAction={onAction} />
      </div>
      <div className="cv-card-meta">
        <span className="cv-card-status" data-draft={draft}>{draft ? 'Draft' : 'Completed'}</span>
        <p className="cv-card-date">Edited {formattedDate}</p>
      </div>
      <div className="cv-card-actions">
        <button type="button" className="cv-card-edit-button" onClick={() => onEdit(cv.id)}>
          <Pencil size={17} aria-hidden="true" /> {draft ? 'Resume draft' : 'Edit'}
        </button>
        <button type="button" className="cv-card-download-button" onClick={() => onDownload(cv.id, 'pdf')}
          aria-label={`Download ${cv.title} as PDF`} title="Download PDF">
          <Download size={20} aria-hidden="true" />
        </button>
        <button type="button" className="cv-card-download-button" onClick={() => onDownload(cv.id, 'docx')}
          aria-label={`Download ${cv.title} as DOCX`} title="Download DOCX">
          <FileType size={20} aria-hidden="true" />
        </button>
      </div>
    </article>
  )
}
