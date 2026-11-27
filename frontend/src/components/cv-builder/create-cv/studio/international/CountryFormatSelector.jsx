import { getInternationalTargetId, internationalFormatCatalog, internationalRegions } from '../templates/internationalFormatCatalog'

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })

export default function CountryFormatSelector({ value, onChange }) {
  const supported = internationalFormatCatalog.some(template => getInternationalTargetId(template) === value)
  return (
    <label className="cv-gallery-field">
      <span>Target country or region</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        <option value="">No target market</option>
        {value && !supported && <option value={value}>{countryNames.of(value)} (guidelines unavailable)</option>}
        {internationalRegions.map(region => (
          <optgroup label={region} key={region}>
            {internationalFormatCatalog.filter(template => template.internationalFormat.region === region).map(template => {
              const id = getInternationalTargetId(template)
              return <option key={id} value={id}>{id === 'europass' ? 'Europass (regional format)' : countryNames.of(id)}</option>
            })}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
