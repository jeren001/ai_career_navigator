import { customFields, standardSections } from '../sections/sectionCatalog'
import { formatDocumentAddress, formatDocumentDate } from '../international/localizationUtils'
import { getHistoryRange, orderHistory } from '../preview/documentContent'

function text(text, role = 'body') {
  return text?.trim() ? [{ text, role }] : []
}

function history(entries, isEducation, layout, localization) {
  return orderHistory(entries, layout.entryOrder).map(entry => ({
    date: getHistoryRange(entry, isEducation ? entry.currentlyStudying : entry.currentlyWorking, isEducation, localization),
    blocks: [
      ...text(isEducation ? entry.degree : entry.jobTitle, 'entry'),
      ...text(isEducation ? entry.institution : entry.company),
      ...text(isEducation ? entry.fieldOfStudy : entry.employmentType),
      ...text(formatDocumentAddress(entry.location, localization.addressFormat)),
      ...text(isEducation && entry.grade?.trim() ? `${localization.label('grade')} ${entry.grade}` : ''),
      ...text(entry.description)
    ]
  })).filter(entry => entry.date || entry.blocks.length)
}

function extraEntries(entries, fields, localization) {
  return entries.map(entry => ({
    blocks: fields.flatMap(({ key }, index) =>
      text(key === 'date' ? formatDocumentDate(entry[key], localization) : entry[key], index === 0 ? 'entry' : 'body')
    )
  })).filter(entry => entry.blocks.length)
}

export function sectionContent(cvData, id, layout, localization) {
  switch (id) {
    case 'summary':
      return { blocks: text(cvData.basicInformation.summary) }
    case 'experience':
      return { entries: history(cvData.workExperience ?? [], false, layout, localization) }
    case 'education':
      return { entries: history(cvData.education ?? [], true, layout, localization) }
    case 'skills': {
      const { technicalSkills = [], softSkills = [] } = cvData.skills ?? {}
      return { blocks: [['technical', technicalSkills], ['soft', softSkills]].flatMap(([label, values]) => {
        const items = values.flatMap(value => text(value, 'bullet'))
        return items.length ? [...text(localization.label(label), 'subheading'), ...items] : []
      }) }
    }
    case 'languages':
      return { blocks: (cvData.skills?.languages ?? []).flatMap(({ name, level }) =>
        name?.trim() ? text([name, level].filter(value => value?.trim()).join(' · '), 'bullet') : []
      ) }
    default: {
      const fields = standardSections[id]?.fields
      if (fields) return { entries: extraEntries(cvData.sections?.content?.[id] ?? [], fields, localization) }
      const custom = cvData.sections?.custom?.find(item => item.id === id)
      return { entries: extraEntries(custom?.entries ?? [], customFields, localization) }
    }
  }
}
