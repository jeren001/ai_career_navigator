import { pageDimensions } from '../design/designDefaults'

export const localizationChoices = {
  dateFormat: {
    label: 'Date format',
    options: { locale: 'CV language', iso: 'ISO (YYYY-MM)', 'month-first': 'Month / year', 'year-first': 'Year / month' }
  },
  phoneFormat: {
    label: 'Phone presentation',
    options: { original: 'Keep original', international: 'International spacing when supported' }
  },
  addressFormat: {
    label: 'Address presentation',
    options: { original: 'Keep original', lines: 'Wrap after commas' }
  },
  direction: {
    label: 'Writing direction',
    options: { auto: 'Match CV language', ltr: 'Left to right (LTR)', rtl: 'Right to left (RTL)' }
  }
}

export default function LocalizationSettings({ draft, currentPageSize, onChange }) {
  return (
    <fieldset className="cv-design-group">
      <legend>Localization settings</legend>
      <label className="cv-design-checkbox">
        <input type="checkbox" checked={draft.headings} onChange={event => onChange('headings', event.target.checked)} />
        Localize standard section headings
      </label>
      <label className="cv-design-checkbox">
        <input type="checkbox" checked={draft.labels} onChange={event => onChange('labels', event.target.checked)} />
        Localize standard document labels
      </label>
      {Object.entries(localizationChoices).map(([key, { label, options }]) => (
        <label className="cv-gallery-field" key={key}>
          <span>{label}</span>
          <select value={draft[key]} onChange={event => onChange(key, event.target.value)}>
            {Object.entries(options).map(([value, name]) => <option key={value} value={value}>{name}</option>)}
          </select>
        </label>
      ))}
      <label className="cv-gallery-field">
        <span>Design page size</span>
        <select value={draft.pageSize} onChange={event => onChange('pageSize', event.target.value)}>
          <option value="">Keep current size ({currentPageSize})</option>
          {Object.entries(pageDimensions).map(([name, [width, height]]) => <option key={name} value={name}>{name} ({width} × {height} mm)</option>)}
        </select>
      </label>
    </fieldset>
  )
}
