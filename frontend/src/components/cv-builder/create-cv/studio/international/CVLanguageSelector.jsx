import { documentLocales } from './documentLocales'

export default function CVLanguageSelector({ label = 'CV language', value, onChange }) {
  return (
    <label className="cv-gallery-field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        {Object.entries(documentLocales).map(([locale, { name }]) => <option key={locale} value={locale} lang={locale}>{name}</option>)}
      </select>
    </label>
  )
}
