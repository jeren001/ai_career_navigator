import { useState } from 'react'
import { CircleCheck, FileText, Pencil } from 'lucide-react'
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

  const statistics = [
    ['total', 'Total CVs', cvs.length, FileText],
    ['completed', 'Completed', cvs.length - drafts, CircleCheck],
    ['drafts', 'Drafts', drafts, Pencil]
  ]

  return (
    <section aria-labelledby="my-cvs-title" className="my-cvs-page">
      <div className="my-cvs-content">
        <svg className="my-cvs-waves" viewBox="0 0 1100 710" preserveAspectRatio="none" aria-hidden="true">
          <path d="M580 213C673 171 650 64 735 29S851 119 924 44L970 0H1100C1043 54 995 81 965 110S904 166 840 166 719 115 653 178Z" />
          <path d="M725 710C824 605 902 672 971 590S1078 534 1100 526V710Z" />
        </svg>
        <MyCVsHeader onBack={onBack} onCreate={onCreate} />
        <dl className="my-cvs-statistics">
          {statistics.map(([id, label, value, Icon]) => (
            <div key={id} data-stat={id}>
              <dt><span aria-hidden="true"><Icon size={22} /></span>{label}</dt><dd>{value}</dd>
            </div>
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
            <div className={view === 'grid' ? 'my-cvs-grid' : 'my-cvs-list'}>
              {shown.map(cv => <CVCard key={cv.id} cv={cv} compact {...actions} />)}
            </div>
          </>
        ))}
      </div>
    </section>
  )
}
