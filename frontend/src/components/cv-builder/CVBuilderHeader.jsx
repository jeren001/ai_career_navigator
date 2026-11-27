// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Builder Header
// PURPOSE: Display the CV Builder page header
// ==========================================

// Import icons
import { FileText } from 'lucide-react'


function CVBuilderHeader() {

  return (
    <header className="cv-builder-header">

      {/* 01. HEADER ICON */}

      <div className="cv-builder-header-icon">
        <FileText
          size={36}
          strokeWidth={2}
          aria-hidden="true"
        />
      </div>


      {/* 02. HEADER CONTENT */}

      <div className="cv-builder-header-content">

        <h1 className="cv-builder-title">
          CV Builder
        </h1>

        <p className="cv-builder-description">
          Create, improve and personalize your CV
          for your next career opportunity.
        </p>

      </div>

    </header>
  )
}

export default CVBuilderHeader
