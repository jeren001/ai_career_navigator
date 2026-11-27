import { useId, useMemo } from 'react'
import CVPreview from '../create-cv/studio/preview/CVPreview'
import { getSavedDocument } from '../create-cv/studio/preview/savedDocument'
import { CVDialog } from './CVManagementDialog'

export default function CVViewer({ cv, onClose, onEdit }) {
  const { cvData, template } = useMemo(() => getSavedDocument(cv), [cv])
  const titleId = useId()

  return (
    <CVDialog label="View CV" onClose={onClose} className="cv-viewer-dialog">
      <div className="my-cvs-heading">
        <h2 dir="auto">{cv.title || 'Untitled CV'}</h2>
        <div className="cv-section-actions">
          <button type="button" className="cv-design-action" onClick={onClose}>Close viewer</button>
          <button type="button" className="cv-design-action" onClick={() => onEdit(cv)}>{cv.status === 'draft' ? 'Resume draft' : 'Edit CV'}</button>
        </div>
      </div>
      <CVPreview cvData={cvData} template={template} exportTitle={cv.title} titleId={titleId} />
    </CVDialog>
  )
}
