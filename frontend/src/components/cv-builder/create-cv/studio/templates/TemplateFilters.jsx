import { internationalRegions } from './internationalFormatCatalog'
import { templateCategories } from './templateCatalog'

export default function TemplateFilters({ value, onChange, showRegions, region, onRegionChange }) {
  return (
    <>
      <label className="cv-gallery-field">
        <span>Category</span>
        <select value={value} onChange={event => onChange(event.target.value)}>
          <option value="">All Templates</option>
          {templateCategories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </label>
      {showRegions && (
        <label className="cv-gallery-field">
          <span>Region</span>
          <select value={region} onChange={event => onRegionChange(event.target.value)}>
            <option value="">All Regions</option>
            {internationalRegions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </label>
      )}
    </>
  )
}
