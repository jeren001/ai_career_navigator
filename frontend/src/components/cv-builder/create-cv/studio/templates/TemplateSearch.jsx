export default function TemplateSearch({ value, onChange }) {
  return (
    <label className="cv-gallery-field">
      <span>Search templates</span>
      <input
        type="search"
        placeholder="Search by name"
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  )
}
