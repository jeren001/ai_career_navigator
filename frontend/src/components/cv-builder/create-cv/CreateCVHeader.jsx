// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Create CV Header
// PURPOSE: Page heading and breadcrumb navigation
// ==========================================

// Import navigation tools
import { Link } from 'react-router-dom'

// Import icons
import {
  Home,
  ChevronRight,
  FilePlus
} from 'lucide-react'


function CreateCVHeader({ onBack, mode = 'create' }) {

  const heading = { create: 'Create CV', draft: 'Resume Draft', edit: 'Edit CV' }[mode]
  return (

    <header className="create-cv-header">

      {/* 01. BREADCRUMB NAVIGATION */}

      <nav
        className="create-cv-breadcrumb"
        aria-label="Breadcrumb"
      >

        <Link
          to="/dashboard"
          className="create-cv-home-link"
          aria-label="Dashboard"
        >
          <Home size={16} />
        </Link>

        <ChevronRight size={14} aria-hidden="true" />

        <button
          type="button"
          className="create-cv-breadcrumb-button"
          onClick={onBack}
        >
          CV Builder
        </button>

        <ChevronRight size={14} aria-hidden="true" />

        <span aria-current="page">
          {heading}
        </span>

      </nav>


      {/* 02. PAGE HEADING */}

      <div className="create-cv-heading">

        <div className="create-cv-heading-icon">

          <FilePlus
            size={44}
            strokeWidth={1.8}
            aria-hidden="true"
          />

        </div>

        <div className="create-cv-heading-content">

          <h1 className="create-cv-title">
            {heading}
          </h1>

          <p className="create-cv-description">
            {mode === 'create' ? 'Build a professional CV from scratch.' : 'Review and update your saved CV.'}
          </p>

        </div>

      </div>

    </header>

  )

}

export default CreateCVHeader