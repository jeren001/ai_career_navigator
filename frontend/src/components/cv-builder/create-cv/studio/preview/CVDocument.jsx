import CVPage from './CVPage'
import CVPersonalInformation from './CVPersonalInformation'
import CVHistory from './CVHistory'
import CVSection, { CVText } from './CVSection'
import { customFields, entryHasContent, standardSections } from '../sections/sectionCatalog'
import { getSectionGroups } from '../sections/sectionDefaults'
import { formatDocumentDate, getLocalization } from '../international/localizationUtils'
import './cv-document.css'

function hasText(entries, fields) {
  return entries.filter(entry => fields.some(field => entry[field]?.trim()))
}

function TextList({ values }) {
  return (
    <ul className="cv-document-list">
      {values.map(value => <li key={value}><bdi>{value}</bdi></li>)}
    </ul>
  )
}

function getSections(cvData, layout, localization) {
  const { basicInformation, workExperience = [], education = [], skills = {} } = cvData
  const work = hasText(workExperience, ['jobTitle', 'company', 'location', 'employmentType', 'startDate', 'endDate', 'description'])
  const study = hasText(education, ['degree', 'institution', 'fieldOfStudy', 'location', 'startDate', 'endDate', 'grade', 'description'])
  const technical = (skills.technicalSkills ?? []).filter(value => value.trim())
  const soft = (skills.softSkills ?? []).filter(value => value.trim())
  const languages = hasText(skills.languages ?? [], ['name'])

  return {
    summary: basicInformation.summary?.trim() && <CVText>{basicInformation.summary}</CVText>,
    experience: work.length > 0 && <CVHistory entries={work} order={layout.entryOrder} localization={localization} />,
    education: study.length > 0 && <CVHistory entries={study} order={layout.entryOrder} localization={localization} studying />,
    skills: (technical.length > 0 || soft.length > 0) && (
      <div className="cv-document-skill-groups">
        {technical.length > 0 && <div><strong>{localization.label('technical')}</strong><TextList values={technical} /></div>}
        {soft.length > 0 && <div><strong>{localization.label('soft')}</strong><TextList values={soft} /></div>}
      </div>
    ),
    languages: languages.length > 0 && (
      <ul className="cv-document-list">
        {languages.map(({ id, name, level }) => (
          <li key={id}><bdi>{name}</bdi>{level?.trim() && <> · <bdi>{level}</bdi></>}</li>
        ))}
      </ul>
    )
  }
}

function renderEntries(entries, fields, localization) {
  const populated = entries.filter(entry => entryHasContent(entry, fields))
  return populated.length > 0 && (
    <ul className="cv-document-history">
      {populated.map(entry => (
        <li key={entry.id}>
          {fields.map(({ key }, index) => entry[key]?.trim() && (
            index === 0
              ? <strong dir="auto" className="cv-document-text" key={key}>{entry[key]}</strong>
              : <CVText key={key}>{key === 'date' ? formatDocumentDate(entry[key], localization) : entry[key]}</CVText>
          ))}
        </li>
      ))}
    </ul>
  )
}

export default function CVDocument({ cvData, layout, design }) {
  const localization = getLocalization(cvData.international)
  const groups = getSectionGroups(cvData, layout, design.columns)
  const sections = getSections(cvData, layout, localization)
  const custom = new Map(cvData.sections?.custom?.map(section => [section.id, section.entries]))

  function renderGroup(items) {
    return items.flatMap(({ id, title, hidden }) => {
      if (hidden) return []
      const fields = standardSections[id]?.fields
      const content = fields
        ? renderEntries(cvData.sections?.content?.[id] ?? [], fields, localization)
        : custom.has(id) ? renderEntries(custom.get(id), customFields, localization) : sections[id]
      const shouldLocalize = localization.headings && localization.locale !== 'en' &&
        !custom.has(id) && !cvData.sections?.settings?.[id]?.title
      return content ? [<CVSection key={id} title={shouldLocalize ? localization.heading(id) : title}>{content}</CVSection>] : []
    })
  }

  const main = renderGroup(groups.main)
  const sidebar = renderGroup(groups.sidebar)
  const position = sidebar.length && main.length ? layout.sidebarPosition ?? 'right' : undefined
  const sidebarColumn = sidebar.length > 0 && <div className="cv-document-sidebar">{sidebar}</div>

  return (
    <CVPage layout={layout} design={design} locale={localization.locale} direction={localization.direction}>
      <CVPersonalInformation information={cvData.basicInformation} photo={design.photo} localization={localization} title={cvData.sections?.settings?.personal?.title} />
      <div className="cv-document-columns" data-sidebar={position}>
        {position === 'left' && sidebarColumn}
        {main.length > 0 && <div className="cv-document-main">{main}</div>}
        {position !== 'left' && sidebarColumn}
      </div>
    </CVPage>
  )
}
