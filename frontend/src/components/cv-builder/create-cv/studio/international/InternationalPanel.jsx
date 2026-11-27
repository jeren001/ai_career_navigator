import { useState } from 'react'
import { resolveDesign } from '../design/designDefaults'
import { getInternationalTargetId, internationalFormatCatalog } from '../templates/internationalFormatCatalog'
import AITranslationPanel from './AITranslationPanel'
import CountryFormatSelector from './CountryFormatSelector'
import CountryGuidelines from './CountryGuidelines'
import CVLanguageSelector from './CVLanguageSelector'
import LocalizationSettings from './LocalizationSettings'
import { countryGuidelinesCatalog } from './countryGuidelinesCatalog'
import { getLocalization, localizationDefaults } from './localizationUtils'

function initialDraft(cvData) {
  return {
    ...localizationDefaults,
    ...cvData.international,
    target: cvData.international?.regionalFormat ?? cvData.basicInformation.targetCountry ?? '',
    templateId: '',
    pageSize: ''
  }
}

export default function InternationalPanel({ cvData, template, onChange }) {
  const [draft, setDraft] = useState(() => initialDraft(cvData))
  const [status, setStatus] = useState('')
  const targetTemplate = internationalFormatCatalog.find(item => getInternationalTargetId(item) === draft.target)
  const { pageSize: currentPageSize } = resolveDesign(template, cvData.design)
  const direction = getLocalization(draft).direction

  function update(key, value) {
    setDraft(previous => ({ ...previous, [key]: value, ...(key === 'target' ? { templateId: '' } : {}) }))
    setStatus('')
  }

  function apply() {
    const { target, templateId, pageSize, ...localization } = draft
    onChange(previous => ({
      ...previous,
      basicInformation: target === 'europass' ? previous.basicInformation : {
        ...previous.basicInformation,
        targetCountry: target
      },
      international: { ...localization, regionalFormat: target === 'europass' ? target : null },
      template: templateId || previous.template,
      design: pageSize ? { ...previous.design, pageSize } : previous.design
    }))
    setDraft(previous => ({ ...previous, templateId: '', pageSize: '' }))
    setStatus('International format applied to the live preview.')
  }

  function reset() {
    onChange(previous => ({ ...previous, international: null }))
    setDraft(initialDraft({ ...cvData, international: null }))
    setStatus('Localization reset. The target country, selected template, and Design settings were kept.')
  }

  return (
    <div className="cv-international-panel">
      <CountryFormatSelector value={draft.target} onChange={value => update('target', value)} />
      {draft.target === 'europass' && <p>Europass is regional. Your Basic Information target country stays as entered.</p>}
      <CVLanguageSelector value={draft.locale} onChange={value => update('locale', value)} />
      <label className="cv-gallery-field">
        <span>International template</span>
        <select value={draft.templateId} onChange={event => update('templateId', event.target.value)}>
          <option value="">Keep {template.name}</option>
          {targetTemplate && targetTemplate.id !== template.id && <option value={targetTemplate.id}>{targetTemplate.name}</option>}
        </select>
      </label>
      <CountryGuidelines guidelines={countryGuidelinesCatalog[draft.target]} onChange={update} />
      <LocalizationSettings draft={draft} currentPageSize={currentPageSize} onChange={update} />
      <p>Review before applying. The document will use {direction.toUpperCase()} direction and {draft.pageSize || currentPageSize} paper. Your original text and custom headings are preserved.</p>
      <div className="cv-section-actions">
        <button type="button" className="cv-design-action" onClick={apply}>Apply International Format</button>
        <button type="button" className="cv-design-action" onClick={reset}>Reset International Settings</button>
      </div>
      <p role="status">{status}</p>
      <AITranslationPanel cvData={cvData} locale={draft.locale} />
    </div>
  )
}
