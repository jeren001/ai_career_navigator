import { useLocale } from '../../../lib/locale.js'
import { cvLabel } from '../cvLabels.js'
import { useId, useMemo } from 'react'
import CVPreview from '../create-cv/studio/preview/CVPreview'
import { getSavedDocument } from '../create-cv/studio/preview/savedDocument'
import { CVDialog } from './CVManagementDialog'

export default function CVViewer({ cv, onClose, onEdit }) {
  const { locale, t } = useLocale()
  const label = (value) => cvLabel(value, locale)
  const { cvData, template } = useMemo(() => getSavedDocument(cv), [cv])
  const titleId = useId()

  return (
    <CVDialog label={label('View CV')} onClose={onClose} className="cv-viewer-dialog">
      <div className="my-cvs-heading">
        <h2 dir="auto">{cv.title || 'Untitled CV'}</h2>
        <div className="cv-section-actions">
          <button type="button" className="cv-design-action" onClick={onClose}>{t('Close viewer', '关闭预览')}</button>
          <button type="button" className="cv-design-action" onClick={() => onEdit(cv)}>{cv.status === 'draft' ? label('Resume draft') : label('Edit CV')}</button>
        </div>
      </div>
      {cv.extractedText && <details>
        <summary>{t('Text from the original file', '原始文件中的文本')}</summary>
        <p style={{ whiteSpace: 'pre-wrap' }} dir="auto">{cv.extractedText}</p>
      </details>}
      <CVPreview cvData={cvData} template={template} exportTitle={cv.title} titleId={titleId} />
    </CVDialog>
  )
}
