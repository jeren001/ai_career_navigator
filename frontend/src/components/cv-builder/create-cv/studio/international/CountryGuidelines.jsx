import { guidelineFields } from './countryGuidelinesCatalog'

export default function CountryGuidelines({ guidelines, onChange }) {
  if (!guidelines) return <p>Choose a supported target market to see available guidance.</p>
  const { recommendations, sources, lastVerified, status, scope } = guidelines

  return (
    <details className="cv-international-details" open>
      <summary>Country guidelines · {status}</summary>
      <p>{scope}</p>
      <dl>
        {Object.entries(guidelineFields).map(([key, label]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{recommendations[key] ?? 'Verified guidance unavailable.'}</dd>
          </div>
        ))}
      </dl>
      {guidelines.presets && (
        <div className="cv-section-actions">
          {guidelines.presets.pageSizes?.map(size => (
            <button key={size} className="cv-design-action" type="button" onClick={() => onChange('pageSize', size)}>Use {size}</button>
          ))}
          {guidelines.presets.dateFormat && (
            <button className="cv-design-action" type="button" onClick={() => onChange('dateFormat', guidelines.presets.dateFormat)}>Use year-first dates</button>
          )}
        </div>
      )}
      {sources.length > 0 && <p>{lastVerified && `Reviewed ${lastVerified}. `}{sources.map((url, index) => (
        <a key={url} href={url} target="_blank" rel="noreferrer">Source {sources.length > 1 ? index + 1 : ''}</a>
      ))}</p>}
    </details>
  )
}
