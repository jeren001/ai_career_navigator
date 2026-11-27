import { BorderStyle, Document, ImageRun, Paragraph, Table, TableCell, TableLayoutType, TableRow, WidthType } from 'docx'
import { pageDimensions, resolveDesign } from '../design/designDefaults'
import { getLocalization } from '../international/localizationUtils'
import { getDocumentContacts, getDocumentSectionTitle } from '../preview/documentContent'
import { getSectionGroups } from '../sections/sectionDefaults'
import { DEFAULT_TEMPLATE_ID, getTemplateById } from '../templates/templateCatalog'
import { sectionContent } from './docxSectionRenderer'
import { createWordStyles, mmToTwips } from './docxStyleUtils'

async function photoRun(photo, localization) {
  const format = /^data:image\/(png|jpeg|webp);base64,/i.exec(photo.src)?.[1]?.toLowerCase()
  if (!format) throw new Error('The profile photo is in an unsupported format.')

  const image = new Image()
  image.src = photo.src
  try {
    await image.decode()
  } catch {
    throw new Error('The profile photo could not be read. Replace it and try again.')
  }
  const scale = Math.min(72 / image.naturalWidth, 72 / image.naturalHeight)
  const transformation = {
    width: Math.max(1, Math.round(image.naturalWidth * scale)),
    height: Math.max(1, Math.round(image.naturalHeight * scale))
  }
  // Word accepts PNG and JPEG. Convert only the WebP photo, leaving CV text native.
  let source = photo.src
  if (format === 'webp') {
    const canvas = document.createElement('canvas')
    canvas.width = transformation.width
    canvas.height = transformation.height
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
    source = canvas.toDataURL('image/png')
  }

  return new ImageRun({
    type: format === 'jpeg' ? 'jpg' : 'png',
    data: source,
    transformation,
    altText: { name: 'Profile photo', title: localization.label('photo'), description: localization.label('photo') }
  })
}

function renderColumn(items, cvData, layout, localization, styles) {
  return items.flatMap(item => {
    if (item.hidden) return []
    const { blocks = [], entries = [] } = sectionContent(cvData, item.id, layout, localization)
    if (!blocks.length && !entries.length) return []
    const title = getDocumentSectionTitle(item, cvData.sections?.settings, localization)
    return [
      styles.paragraph(title, 'heading'),
      ...blocks.map(block => styles.paragraph(block.text, block.role)),
      ...entries.flatMap(({ date, blocks: entryBlocks }) => {
        const dateParagraph = date && styles.paragraph(date, 'date', { keepNext: entryBlocks.length > 0 })
        const paragraphs = entryBlocks.map((block, index) =>
          styles.paragraph(block.text, block.role, {
            keepNext: block.role === 'entry' && index < entryBlocks.length - 1
          })
        )
        return dateParagraph ? [dateParagraph, ...paragraphs] : paragraphs
      })
    ]
  })
}

function columnTable(main, sidebar, layout, width, styles) {
  const sidebarWidth = Math.round(width * 0.4)
  const edgeBorder = { style: BorderStyle.NONE }
  const column = (children, size, fill) => new TableCell({
    children,
    width: { size, type: WidthType.DXA },
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    shading: fill ? { fill } : undefined
  })
  const mainColumn = column(main, width - sidebarWidth)
  const sidebarColumn = column(sidebar, sidebarWidth, 'F2F6FB')
  const sidebarFirst = layout.sidebarPosition === 'left'
  return new Table({
    // Word may split this row across pages. Neither cell uses a fixed height.
    rows: [new TableRow({ children: sidebarFirst ? [sidebarColumn, mainColumn] : [mainColumn, sidebarColumn] })],
    width: { size: width, type: WidthType.DXA },
    columnWidths: sidebarFirst ? [sidebarWidth, width - sidebarWidth] : [width - sidebarWidth, sidebarWidth],
    borders: { top: edgeBorder, bottom: edgeBorder, left: edgeBorder, right: edgeBorder, insideHorizontal: edgeBorder, insideVertical: edgeBorder },
    layout: TableLayoutType.FIXED,
    alignment: styles.start,
    visuallyRightToLeft: styles.rtl
  })
}

export async function renderWordDocument(data, title) {
  const cvData = { ...data, basicInformation: data.basicInformation ?? {} }
  const template = getTemplateById(cvData.template) ?? getTemplateById(DEFAULT_TEMPLATE_ID)
  const { layout } = template
  const design = resolveDesign(template, cvData.design)
  const localization = getLocalization(cvData.international)
  const styles = createWordStyles(design, layout, localization)
  const groups = getSectionGroups(cvData, layout, design.columns)
  const [width, height] = (pageDimensions[design.pageSize] ?? pageDimensions.A4).map(mmToTwips)
  const margin = mmToTwips(design.margins)

  const { fullName, jobTitle, careerLevel } = cvData.basicInformation
  const contacts = getDocumentContacts(cvData.basicInformation, localization)
  const personalTitle = cvData.sections?.settings?.personal?.title
  const children = []
  if (personalTitle?.trim()) children.push(styles.paragraph(personalTitle, 'identity'))
  if (design.photo) {
    children.push(new Paragraph({
      ...styles.header,
      spacing: styles.spacing,
      bidirectional: styles.rtl,
      keepNext: Boolean(fullName?.trim()),
      children: [await photoRun(design.photo, localization)]
    }))
  }
  if (fullName?.trim()) children.push(styles.paragraph(fullName, 'title', {
    keepNext: [jobTitle, careerLevel, ...Object.values(contacts)].some(value => value?.trim())
  }))
  for (const value of [jobTitle, careerLevel]) {
    if (value?.trim()) children.push(styles.paragraph(value, 'identity'))
  }
  for (const [key, value] of Object.entries(contacts)) {
    if (value?.trim()) children.push(styles.paragraph(value, 'contact', { bidirectional: key === 'location' && styles.rtl }))
  }

  const main = renderColumn(groups.main, cvData, layout, localization, styles)
  const sidebar = renderColumn(groups.sidebar, cvData, layout, localization, styles)
  if (main.length && sidebar.length) children.push(columnTable(main, sidebar, layout, width - margin * 2, styles))
  else children.push(...main, ...sidebar)
  if (!children.length) children.push(styles.paragraph(''))

  return new Document({
    title,
    sections: [{
      properties: {
        page: { size: { width, height }, margin: { top: margin, right: margin, bottom: margin, left: margin } }
      },
      children
    }]
  })
}
