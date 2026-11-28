import { useMemo } from 'react'
import { pageDimensions } from '../design/designDefaults'
import CVPaginationSource from '../preview/CVPaginationSource'
import useCVPagination from '../preview/useCVPagination'
import { getSavedDocument } from '../preview/savedDocument'
import PDFExportDialog from './PDFExportDialog'

export default function SavedCVExport({ record, onClose }) {
  const { cvData, template, design } = useMemo(() => getSavedDocument(record), [record])
  const [width, height] = pageDimensions[design.pageSize] ?? pageDimensions.A4
  const { source, staging, result } = useCVPagination(cvData, template.layout, design, height)

  return (
    <>
      <CVPaginationSource cvData={cvData} layout={template.layout} design={design} width={width} source={source} staging={staging} />
      <PDFExportDialog title={record.title} result={result} width={width} height={height} onClose={onClose} />
    </>
  )
}
