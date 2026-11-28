import { useId } from 'react'
import { documentLocales } from './documentLocales'

export default function CVLanguageSelector({ label = 'CV language', value, onChange, showHelp = false }) {
  const helpId = useId()

  return (
    <label className="cv-gallery-field">
      <span>{label}</span>
      {showHelp && <small id={helpId}>Choose the language used for standard CV headings and labels.</small>}
      <select aria-describedby={showHelp ? helpId : undefined} value={value} onChange={event => onChange(event.target.value)}>
        {Object.entries(documentLocales).map(([locale, { name }]) => <option key={locale} value={locale} lang={locale}>{name}</option>)}
      </select>
    </label>
  )
}
