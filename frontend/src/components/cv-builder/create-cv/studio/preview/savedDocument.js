import { DEFAULT_TEMPLATE_ID, getTemplateById } from '../templates/templateCatalog'
import { resolveDesign } from '../design/designDefaults'

export function getSavedDocument(record) {
  const data = record.data
  const template = getTemplateById(data?.template ?? record.templateId) ?? getTemplateById(DEFAULT_TEMPLATE_ID)
  const cvData = { ...data, basicInformation: data?.basicInformation ?? {}, template: template.id }
  return { cvData, template, design: resolveDesign(template, cvData.design) }
}
