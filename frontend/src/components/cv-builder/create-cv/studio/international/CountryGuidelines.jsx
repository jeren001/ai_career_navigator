import { BookOpen } from 'lucide-react'
import { guidelineFields } from './countryGuidelinesCatalog'

export default function CountryGuidelines({ guidelines, onChange }) {
  const { recommendations, sources, lastVerified, status, scope } = guidelines ?? {}

  return (
    <section className="cv-international-card">
      <h4><BookOpen size={18} aria-hidden="true" /> Country Guidelines</h4>
      <p>Learn about local recruitment practices, recommended CV sections, profile photos and document length.</p>
      {guidelines ? (
        <details className="cv-international-details">
          <summary>View guidelines · {status}</summary>
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
      ) : <p>Guidelines unavailable. Choose a supported target market to see existing guidance.</p>}
    </section>
  )
}
