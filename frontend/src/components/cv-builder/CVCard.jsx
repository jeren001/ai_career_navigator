// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Card
// PURPOSE: Display an individual saved CV
// ==========================================

// Import icons
import {
  FileText,
  Pencil,
  Download,
  MoreVertical
} from 'lucide-react'


function CVCard({
  cv,
  onEdit,
  onDownload,
  onOpenMenu
}) {

  // ==========================================
  // 01. FORMAT LAST UPDATED DATE
  // ==========================================

  const formattedDate = cv.updatedAt
    ? new Date(cv.updatedAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : 'Not available'


  // ==========================================
  // 02. CARD LAYOUT
  // ==========================================

  return (
    <article className="cv-card">

      {/* CV PREVIEW */}

      <div className="cv-card-preview">

        {cv.previewUrl ? (

          <img
            src={cv.previewUrl}
            alt={`${cv.title} preview`}
            loading="lazy"
          />

        ) : (

          <FileText
            size={64}
            strokeWidth={1.2}
            aria-hidden="true"
          />

        )}

      </div>


      {/* CV INFORMATION */}

      <div className="cv-card-information">

        <div className="cv-card-details">

          <h3 className="cv-card-title">
            {cv.title}
          </h3>

          <p className="cv-card-template">
            {cv.template}{cv.status === 'draft' && ' · Draft'}
          </p>

        </div>


        {/* MORE OPTIONS */}

        <button
          type="button"
          className="cv-card-menu-button"
          onClick={() => onOpenMenu(cv.id)}
          aria-label={`More options for ${cv.title}`}
          title="More options"
        >
          <MoreVertical size={20} />
        </button>

      </div>


      {/* LAST UPDATED DATE */}

      <p className="cv-card-date">
        Edited {formattedDate}
      </p>


      {/* CARD ACTIONS */}

      <div className="cv-card-actions">

        <button
          type="button"
          className="cv-card-edit-button"
          onClick={() => onEdit(cv.id)}
        >
          <Pencil size={17} />
          <span>{cv.status === 'draft' ? 'Resume draft' : 'Edit'}</span>
        </button>

        <button
          type="button"
          className="cv-card-download-button"
          onClick={() => onDownload(cv.id)}
          aria-label={`Download ${cv.title} as PDF`}
          title="Download PDF"
        >
          <Download size={20} />
        </button>

      </div>

    </article>
  )
}

export default CVCard