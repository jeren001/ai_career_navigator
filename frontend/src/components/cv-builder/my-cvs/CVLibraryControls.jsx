import { Grid2X2, List, Search } from 'lucide-react'

export default function CVLibraryControls({ query, status, sort, view, onQuery, onStatus, onSort, onView }) {
  return (
    <div className="my-cvs-controls">
      <label className="cv-gallery-field">
        <span>Search CVs</span>
        <div className="my-cvs-search">
          <Search size={17} aria-hidden="true" />
          <input type="search" value={query} onChange={event => onQuery(event.target.value)} placeholder="Search name or template" />
        </div>
      </label>
      <label className="cv-gallery-field">
        <span>Status</span>
        <select value={status} onChange={event => onStatus(event.target.value)}>
          <option value="all">All CVs</option>
          <option value="completed">Completed</option>
          <option value="draft">Drafts</option>
        </select>
      </label>
      <label className="cv-gallery-field">
        <span>Sort by</span>
        <select value={sort} onChange={event => onSort(event.target.value)}>
          <option value="modified">Last modified</option>
          <option value="created">Creation date</option>
          <option value="name">Name (A–Z)</option>
        </select>
      </label>
      <div className="cv-section-actions" role="group" aria-label="CV display">
        <button type="button" className="cv-design-action" aria-pressed={view === 'grid'} onClick={() => onView('grid')}>
          <Grid2X2 size={16} aria-hidden="true" /> Grid
        </button>
        <button type="button" className="cv-design-action" aria-pressed={view === 'list'} onClick={() => onView('list')}>
          <List size={16} aria-hidden="true" /> List
        </button>
      </div>
    </div>
  )
}
