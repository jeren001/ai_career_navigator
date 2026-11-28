import { useLocale } from '../../lib/locale.js'
import { cvLabel } from './cvLabels.js'
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Recent CVs
// PURPOSE: Display recently updated CVs
// ==========================================

// Import icons
import { ArrowRight } from 'lucide-react'

// Import components
import CVCard from './CVCard'
import CVEmptyState from './CVEmptyState'


function RecentCVs({
  cvs = [],
  onViewAll,
  onEdit,
  onDownload,
  onAction
}) {
  const { locale } = useLocale()
  const label = (value) => cvLabel(value, locale)

  // ==========================================
  // 01. SORT AND LIMIT RECENT CVS
  // ==========================================

  const recentCVs = [...cvs]
    .sort(
      (a, b) =>
        new Date(b.updatedAt) - new Date(a.updatedAt)
    )
    .slice(0, 3)


  // ==========================================
  // 02. SECTION LAYOUT
  // ==========================================

  return (
    <section
      className="recent-cvs"
      aria-labelledby="recent-cvs-title"
    >

      {/* SECTION HEADER */}

      <div className="recent-cvs-header">

        <h2
          id="recent-cvs-title"
          className="recent-cvs-title"
        >
          {label('Recent CVs')}
        </h2>

        <button
          type="button"
          className="recent-cvs-view-all"
          onClick={onViewAll}
        >
          <span>View all</span>

          <ArrowRight
            size={18}
            aria-hidden="true"
          />
        </button>

      </div>


      {/* EMPTY STATE OR CV COLLECTION */}

      {recentCVs.length === 0 ? (

        <CVEmptyState />

      ) : (

        <div className="recent-cvs-grid">

          {recentCVs.map((cv) => (

            <CVCard
              key={cv.id}
              cv={cv}
              onEdit={onEdit}
              onDownload={onDownload}
              onAction={onAction}
            />

          ))}

        </div>

      )}

    </section>
  )
}

export default RecentCVs