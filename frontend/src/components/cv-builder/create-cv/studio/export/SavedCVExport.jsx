import { useMemo } from 'react'
import { pageDimensions, resolveDesign } from '../design/designDefaults'
import CVPaginationSource from '../preview/CVPaginationSource'
import useCVPagination from '../preview/useCVPagination'
import { DEFAULT_TEMPLATE_ID, getTemplateById } from '../templates/templateCatalog'
import PDFExportDialog from './PDFExportDialog'

export default function SavedCVExport({ record, onClose }) {
  const { cvData, template, design } = useMemo(() => {
    const data = record.data
    const selected = getTemplateById(data?.template ?? record.templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID)
    return {
      cvData: { ...data, basicInformation: data?.basicInformation ?? {} },
      template: selected,
      design: resolveDesign(selected, data?.design)
    }
  }, [record])
  const [width, height] = pageDimensions[design.pageSize] ?? pageDimensions.A4
  const { source, staging, result } = useCVPagination(cvData, template.layout, design, height)

  return (
    <>
      <CVPaginationSource cvData={cvData} layout={template.layout} design={design} width={width} source={source} staging={staging} />
      <PDFExportDialog title={record.title} result={result} width={width} height={height} onClose={onClose} />
    </>
  )
}
