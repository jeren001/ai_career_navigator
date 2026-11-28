import { Languages } from 'lucide-react'
import { useState } from 'react'
import CVLanguageSelector from './CVLanguageSelector'
import { customFields, standardSections } from '../sections/sectionCatalog'

function values(record, fields) {
  return fields.map(field => record?.[field]).filter(value => value?.trim())
}

function getOriginalText(cvData) {
  const { basicInformation, workExperience = [], education = [], skills = {}, sections } = cvData
  return [
    ...values(basicInformation, ['fullName', 'jobTitle', 'email', 'phone', 'location', 'summary']),
    ...workExperience.flatMap(item => values(item, ['jobTitle', 'company', 'location', 'employmentType', 'startDate', 'endDate', 'description'])),
    ...education.flatMap(item => values(item, ['degree', 'institution', 'fieldOfStudy', 'location', 'startDate', 'endDate', 'grade', 'description'])),
    ...(skills.technicalSkills ?? []),
    ...(skills.softSkills ?? []),
    ...(skills.languages ?? []).flatMap(item => values(item, ['name', 'level'])),
    ...Object.entries(sections?.content ?? {}).flatMap(([id, entries]) =>
      entries.flatMap(entry => values(entry, standardSections[id].fields.map(({ key }) => key)))
    ),
    ...(sections?.custom ?? []).flatMap(({ title, entries }) =>
      [title, ...entries.flatMap(entry => values(entry, customFields.map(({ key }) => key)))]
    )
  ].join('\n\n')
}

export default function AITranslationPanel({ cvData, locale }) {
  const [source, setSource] = useState('en')
  const [target, setTarget] = useState(null)

  return (
    <section className="cv-international-card">
      <h4><Languages size={18} aria-hidden="true" /> AI Translation <span className="cv-international-badge">Coming Soon</span></h4>
      <p>Translate your professional summary, experience and other written content into your chosen language.</p>
      <details className="cv-international-details">
        <summary>Translation options</summary>
        <p>Translation will require an approved service and manual review before changes can be applied.</p>
        <CVLanguageSelector label="Original language" value={source} onChange={setSource} />
        <CVLanguageSelector label="Target language" value={target ?? locale} onChange={setTarget} />
        <label className="cv-gallery-field">
          <span>Original content</span>
          <textarea dir="auto" rows={5} value={getOriginalText(cvData)} readOnly />
        </label>
        <label className="cv-gallery-field">
          <span>Translated content · Manual review</span>
          <textarea rows={5} disabled placeholder="Translation is unavailable." />
        </label>
        <div className="cv-section-actions">
          {['Translate', 'Apply Translation', 'Restore Original'].map(label => (
            <button className="cv-design-action" type="button" disabled key={label}>{label}</button>
          ))}
        </div>
      </details>
    </section>
  )
}
