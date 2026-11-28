import { useState } from 'react'
import { INTERNATIONAL_CATEGORY } from './internationalFormatCatalog'
import TemplateCard from './TemplateCard'
import TemplateFilters from './TemplateFilters'
import TemplatePagination from './TemplatePagination'
import TemplateSearch from './TemplateSearch'
import TemplateSort from './TemplateSort'
import { DEFAULT_TEMPLATE_ID, templateCatalog } from './templateCatalog'

const PAGE_SIZE = 6

function compareNames(first, second) {
  return first.name.localeCompare(second.name, 'en') || first.id.localeCompare(second.id, 'en')
}

const comparators = {
  'name-asc': compareNames,
  'name-desc': (first, second) => compareNames(second, first),
  newest: (first, second) => second.createdAt.localeCompare(first.createdAt) || compareNames(first, second),
  oldest: (first, second) => first.createdAt.localeCompare(second.createdAt) || compareNames(first, second),
  popularity: (first, second) => second.popularity - first.popularity || compareNames(first, second)
}

// Enable ranking once the catalog has a measured popularity value for every template.
const hasPopularity = templateCatalog.length > 0 &&
  templateCatalog.every(template => Number.isFinite(template.popularity))

export default function TemplateGallery({ selectedTemplate = DEFAULT_TEMPLATE_ID, onChange }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [region, setRegion] = useState('')
  const [sort, setSort] = useState('name-asc')
  const [page, setPage] = useState(1)

  const showRegions = category === INTERNATIONAL_CATEGORY
  const searchTerm = query.trim().toLowerCase()
  const results = templateCatalog
    .filter(template => template.name.toLowerCase().includes(searchTerm))
    .filter(template => !category || template.category === category)
    .filter(template => !showRegions || !region || template.internationalFormat?.region === region)
    .sort(comparators[sort])
  const pageCount = Math.ceil(results.length / PAGE_SIZE)
  const visibleTemplates = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function resetFilters() {
    setQuery('')
    setCategory('')
    setRegion('')
    setPage(1)
  }

  return (
    <div className="cv-gallery">
      <div className="cv-gallery-controls">
        <TemplateSearch value={query} onChange={value => {
          setQuery(value)
          setPage(1)
        }} />
        <TemplateFilters
          value={category}
          onChange={value => {
            setCategory(value)
            setRegion('')
            setPage(1)
          }}
          showRegions={showRegions}
          region={region}
          onRegionChange={value => {
            setRegion(value)
            setPage(1)
          }}
        />
        <TemplateSort value={sort} hasPopularity={hasPopularity} onChange={value => {
          setSort(value)
          setPage(1)
        }} />
      </div>

      {results.length > 0 ? (
        <>
          <p className="cv-gallery-status" role="status">
            {results.length} {results.length === 1 ? 'template' : 'templates'} found
            {pageCount > 1 && ` · Page ${page} of ${pageCount}`}
          </p>
          <div className="cv-template-grid" role="group" aria-label="CV templates">
            {visibleTemplates.map(template => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={selectedTemplate === template.id}
                onSelect={onChange}
              />
            ))}
          </div>
          <TemplatePagination page={page} pageCount={pageCount} onChange={setPage} />
        </>
      ) : (
        <div className="cv-gallery-empty">
          <p role="status">No templates match these filters.</p>
          <button type="button" onClick={resetFilters}>Clear search and filters</button>
        </div>
      )}

      <div className="cv-template-note">
        <p>Your CV will use the selected template.</p>
      </div>
    </div>
  )
}
