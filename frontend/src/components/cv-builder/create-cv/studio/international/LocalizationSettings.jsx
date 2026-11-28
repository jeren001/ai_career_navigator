import { useId } from 'react'
import { ChevronDown, SlidersHorizontal } from 'lucide-react'
import { pageDimensions } from '../design/designDefaults'

const localizationChoices = {
  dateFormat: {
    label: 'Date format',
    help: 'Choose how months and years appear in the document.',
    options: { locale: 'CV language', iso: 'ISO (YYYY-MM)', 'month-first': 'Month / year', 'year-first': 'Year / month' }
  },
  phoneFormat: {
    label: 'Phone presentation',
    help: 'Adjust spacing while retaining the original number and calling code.',
    options: { original: 'Keep original', international: 'International spacing when supported' }
  },
  addressFormat: {
    label: 'Address presentation',
    help: 'Choose whether to start a new line after commas.',
    options: { original: 'Keep original', lines: 'Wrap after commas' }
  },
  direction: {
    label: 'Writing direction',
    help: 'Follow the CV language or set the reading direction manually.',
    options: { auto: 'Match CV language', ltr: 'Left to right (LTR)', rtl: 'Right to left (RTL)' }
  }
}

export default function LocalizationSettings({ draft, currentPageSize, onChange }) {
  const id = useId()
  return (
    <details className="cv-international-card cv-international-disclosure">
      <summary>
        <SlidersHorizontal size={18} aria-hidden="true" />
        <span><strong>Advanced Localization Settings</strong><small>Personalize how details appear in your CV.</small></span>
        <ChevronDown size={16} aria-hidden="true" />
      </summary>
      <div className="cv-international-fields">
        <label className="cv-design-checkbox">
          <input type="checkbox" aria-describedby={`${id}-headings`} checked={draft.headings} onChange={event => onChange('headings', event.target.checked)} />
          <span>Localize standard section headings<small id={`${id}-headings`}>Use the CV language for built-in headings. Custom headings stay as entered.</small></span>
        </label>
        <label className="cv-design-checkbox">
          <input type="checkbox" aria-describedby={`${id}-labels`} checked={draft.labels} onChange={event => onChange('labels', event.target.checked)} />
          <span>Localize standard document labels<small id={`${id}-labels`}>Use the CV language for built-in labels such as Present.</small></span>
        </label>
        {Object.entries(localizationChoices).map(([key, { label, help, options }]) => (
          <label className="cv-gallery-field" key={key}>
            <span>{label}</span>
            <small id={`${id}-${key}`}>{help}</small>
            <select aria-describedby={`${id}-${key}`} value={draft[key]} onChange={event => onChange(key, event.target.value)}>
              {Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
            </select>
          </label>
        ))}
        <label className="cv-gallery-field">
          <span>Design page size</span>
          <small id={`${id}-size`}>Keep your Design page size or choose a different paper format.</small>
          <select aria-describedby={`${id}-size`} value={draft.pageSize} onChange={event => onChange('pageSize', event.target.value)}>
            <option value="">Keep current size ({currentPageSize})</option>
            {Object.entries(pageDimensions).map(([name, [width, height]]) => <option key={name} value={name}>{name} ({width} × {height} mm)</option>)}
          </select>
        </label>
      </div>
    </details>
  )
}
