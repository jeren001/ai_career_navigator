export default function TemplateSort({ value, onChange, hasPopularity }) {
  return (
    <label className="cv-gallery-field">
      <span>Sort by</span>
      <select value={value} onChange={event => onChange(event.target.value)}>
        <option value="name-asc">Name (A–Z)</option>
        <option value="name-desc">Name (Z–A)</option>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="popularity" disabled={!hasPopularity}>
          {hasPopularity ? 'Most popular' : 'Popularity (unavailable)'}
        </option>
      </select>
    </label>
  )
}
