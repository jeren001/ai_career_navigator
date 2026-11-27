import { AlignmentType, BorderStyle, HeadingLevel, Paragraph, TextRun } from 'docx'
import { fontFamilies } from '../design/designDefaults'

export const mmToTwips = mm => Math.round(mm * 1440 / 25.4)

const rtlLetter = /[\p{Script=Arabic}\p{Script=Hebrew}]/u

function usesRTL(text) {
  const firstLetter = text.match(/\p{L}/u)?.[0]
  return Boolean(firstLetter && rtlLetter.test(firstLetter))
}

function eastAsianFont(text, locale) {
  if (/[\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text) || locale === 'ja') return 'Yu Gothic'
  if (/\p{Script=Hangul}/u.test(text) || locale === 'ko') return 'Malgun Gothic'
  return 'Microsoft YaHei'
}

export function createWordStyles(design, layout, localization) {
  const accent = design.accent.slice(1).toUpperCase()
  const fontName = (fontFamilies[design.fontFamily] ?? fontFamilies['sans-serif']).split(',')[0].replaceAll('"', '')
  const fontSize = Math.round(design.fontSize * 2)
  const rtl = localization.direction === 'rtl'
  const start = rtl ? AlignmentType.RIGHT : AlignmentType.LEFT
  const titleAlignment = layout.header === 'centered' ? AlignmentType.CENTER : start
  const channels = accent.match(/../g).map(value => {
    const channel = parseInt(value, 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  const lightAccent = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 > 1.05 / 4.5 - 0.05
  const headingColor = lightAccent ? '071B60' : accent

  const spacing = { line: Math.round(design.lineSpacing * 240), after: 60 }
  const headerFill = layout.header === 'solid' ? accent : layout.header === 'tinted' ? 'EEF5FF' : undefined
  const header = {
    alignment: titleAlignment,
    shading: headerFill ? { fill: headerFill } : undefined
  }
  const headerColor = layout.header === 'solid' ? (lightAccent ? '000000' : 'FFFFFF') : '202B3A'
  const border = { style: BorderStyle.SINGLE, size: 6, color: accent, space: 3 }

  function runs(value, properties = {}) {
    return value.split(/\r\n|\r|\n/).map((part, index) => new TextRun({
      text: part,
      break: index ? 1 : undefined,
      size: fontSize,
      sizeComplexScript: properties.size ?? fontSize,
      font: {
        ascii: fontName, hAnsi: fontName,
        eastAsia: eastAsianFont(part, localization.locale),
        cs: /\p{Script=Devanagari}/u.test(part) ? 'Nirmala UI' : 'Arial'
      },
      language: {
        value: localization.locale,
        eastAsia: localization.locale,
        bidirectional: localization.locale === 'ar' ? 'ar' : undefined
      },
      rightToLeft: usesRTL(part) || undefined,
      ...properties
    }))
  }

  function paragraph(value, role = 'body', overrides = {}) {
    const bold = ['title', 'heading', 'subheading', 'entry'].includes(role)
    const masthead = ['title', 'contact', 'identity'].includes(role)
    const size = role === 'title' ? Math.round(fontSize * 1.65) : role === 'heading' ? Math.round(fontSize * 1.1) : fontSize
    return new Paragraph({
      alignment: start,
      bidirectional: rtl,
      spacing: { ...spacing, before: role === 'heading' ? 130 : 0 },
      keepNext: ['heading', 'subheading', 'entry', 'date', 'title'].includes(role),
      heading: role === 'title' ? HeadingLevel.TITLE : role === 'heading' ? HeadingLevel.HEADING_1 : role === 'subheading' ? HeadingLevel.HEADING_2 : undefined,
      bullet: role === 'bullet' ? { level: 0 } : undefined,
      border: role === 'heading' && layout.sectionStyle !== 'open' ? { bottom: border }
        : role === 'title' && layout.header === 'ruled' ? { top: border, bottom: border } : undefined,
      ...(masthead ? header : {}),
      ...overrides,
      children: runs(value, {
        size, bold, boldComplexScript: bold,
        color: masthead ? (role === 'title' && layout.header !== 'solid' ? headingColor : headerColor)
          : role === 'heading' ? headingColor : role === 'date' ? '42536A' : '202B3A'
      })
    })
  }

  return { rtl, start, header, spacing, paragraph }
}
