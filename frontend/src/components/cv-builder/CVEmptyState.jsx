// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Empty State
// PURPOSE: Display an empty CV collection
// ==========================================

// Import icons
import { FileText } from 'lucide-react'


function CVEmptyState() {

  return (
    <div className="cv-empty-state">

      {/* 01. EMPTY STATE ICON */}

      <div className="cv-empty-icon">

        <FileText
          size={48}
          strokeWidth={1.5}
          aria-hidden="true"
        />

      </div>


      {/* 02. EMPTY STATE TITLE */}

      <h3 className="cv-empty-title">
        No CVs yet
      </h3>


      {/* 03. EMPTY STATE DESCRIPTION */}

      <p className="cv-empty-description">
        Create your first CV and start your career journey.
      </p>

    </div>
  )
}

export default CVEmptyState