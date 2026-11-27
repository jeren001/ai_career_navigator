import { useState } from 'react'
import CVCard from '../CVCard'
import CVEmptyState from '../CVEmptyState'
import MyCVsHeader from './MyCVsHeader'
import CVLibraryControls from './CVLibraryControls'

const nameOrder = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const timestamp = value => Date.parse(value) || 0
const statusOf = cv => cv.status === 'draft' ? 'draft' : 'completed'
const sorters = {
  name: (first, second) => nameOrder.compare(first.title || '', second.title || ''),
  modified: (first, second) => timestamp(second.updatedAt ?? second.createdAt) - timestamp(first.updatedAt ?? first.createdAt),
  created: (first, second) => timestamp(second.createdAt) - timestamp(first.createdAt)
}

export default function MyCVs({ cvs, loading, onBack, onCreate, ...actions }) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('modified')
  const [view, setView] = useState('grid')
  const search = query.trim().toLocaleLowerCase()
  const drafts = cvs.filter(cv => statusOf(cv) === 'draft').length
  const shown = cvs.filter(cv => (status === 'all' || statusOf(cv) === status) && (
    !search || [cv.title, cv.template].some(value => value?.toLocaleLowerCase().includes(search))
  )).sort((first, second) => sorters[sort](first, second) || nameOrder.compare(first.title || '', second.title || ''))

  return (
    <section aria-labelledby="my-cvs-title" className="my-cvs-page">
      <MyCVsHeader onBack={onBack} onCreate={onCreate} />
      <dl className="my-cvs-statistics">
        {[['Total CVs', cvs.length], ['Completed', cvs.length - drafts], ['Drafts', drafts]].map(([label, value]) => (
          <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
        ))}
      </dl>
      <CVLibraryControls query={query} status={status} sort={sort} view={view}
        onQuery={setQuery} onStatus={setStatus} onSort={setSort} onView={setView} />
      {!loading && (cvs.length === 0 ? <CVEmptyState /> : shown.length === 0 ? (
        <div className="cv-empty-state">
          <h2 className="cv-empty-title" role="status">No matching CVs</h2>
          <button type="button" className="cv-design-action" onClick={() => { setQuery(''); setStatus('all') }}>Clear search and filters</button>
        </div>
      ) : (
        <>
          <p className="my-cvs-results" role="status">{shown.length} {shown.length === 1 ? 'CV' : 'CVs'}</p>
          <div className={view === 'grid' ? 'recent-cvs-grid' : 'my-cvs-list'}>
            {shown.map(cv => <CVCard key={cv.id} cv={cv} {...actions} />)}
          </div>
        </>
      ))}
    </section>
  )
}
