import { useEffect, useRef, useState } from 'react'
import BasicInformation, { ProfessionalSummaryField } from '../../BasicInformation'
import WorkExperience from '../../WorkExperience'
import Education from '../../Education'
import Skills from '../../Skills'
import SectionFields from './SectionFields'
import { customFields, entryHasContent, standardSections, TITLE_LIMIT } from './sectionCatalog'

export default function EditSectionPanel({ item, cvData, validateStep, onSave, onCancel }) {
  const definition = standardSections[item.id]
  const [title, setTitle] = useState(item.title)
  const [draft, setDraft] = useState(cvData)
  const [entries, setEntries] = useState(() =>
    item.custom
      ? cvData.sections?.custom?.find(section => section.id === item.id)?.entries ?? []
      : cvData.sections?.content?.[item.id] ?? []
  )
  const [errors, setErrors] = useState({})
  const [titleError, setTitleError] = useState('')
  const titleInput = useRef(null)
  const fields = item.custom ? customFields : definition.fields

  useEffect(() => titleInput.current?.focus(), [])

  function update(field, value) {
    setDraft(previous => ({ ...previous, [field]: value }))
    setErrors({})
  }

  function save() {
    const trimmedTitle = title.trim()
    const error = trimmedTitle.length === 0
      ? 'Enter a section heading.'
      : trimmedTitle.length > TITLE_LIMIT ? `Use ${TITLE_LIMIT} characters or fewer.` : ''
    setTitleError(error)
    const validationErrors = definition?.step ? validateStep(definition.step, draft) : {}
    setErrors(validationErrors)
    if (error || Object.keys(validationErrors).length) return

    onSave(item, trimmedTitle, draft, fields ? entries.filter(entry => entryHasContent(entry, fields)) : [])
  }

  function renderFields() {
    switch (item.id) {
      case 'personal':
        return <BasicInformation showSummary={false} data={draft.basicInformation} errors={errors} onChange={(field, value) => update('basicInformation', { ...draft.basicInformation, [field]: value })} />
      case 'summary':
        return <ProfessionalSummaryField value={draft.basicInformation.summary} onChange={value => update('basicInformation', { ...draft.basicInformation, summary: value })} />
      case 'experience':
        return <WorkExperience experiences={draft.workExperience} errors={errors} onChange={value => update('workExperience', value)} />
      case 'education':
        return <Education education={draft.education} errors={errors} onChange={value => update('education', value)} />
      case 'skills':
      case 'languages':
        return <Skills mode={item.id} data={draft.skills} errors={errors} onChange={(field, value) => update('skills', { ...draft.skills, [field]: value })} />
      default:
        return <SectionFields fields={fields} entries={entries} onChange={setEntries} />
    }
  }

  return (
    <section className="cv-section-editor" aria-label={item.isNew ? 'Create custom section' : 'Edit section'}>
      <h4>{item.isNew ? 'Create custom section' : `Edit ${item.title}`}</h4>
      <label className="cv-gallery-field">
        <span>Section heading</span>
        <input ref={titleInput} dir="auto" value={title} aria-invalid={Boolean(titleError)} onChange={event => { setTitle(event.target.value); setTitleError('') }} />
      </label>
      {titleError && <p className="cv-field-error" role="alert">{titleError}</p>}
      {renderFields()}
      {Object.keys(errors).length > 0 && <p className="cv-field-error" role="alert">Correct the highlighted fields before saving.</p>}
      <div className="cv-section-actions">
        <button type="button" className="cv-design-action" onClick={save}>Save section</button>
        <button type="button" className="cv-design-action" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  )
}
