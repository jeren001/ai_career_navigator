// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Action Card
// PURPOSE: Reusable CV Builder action card
// ==========================================

// Import icons
import { ArrowRight } from 'lucide-react'


function CVActionCard({
  icon: Icon,
  title,
  description,
  onClick
}) {

  return (

    <button
      type="button"
      className="cv-action-card"
      onClick={onClick}
    >

      {/* 01. ACTION ICON */}

      <span className="cv-action-icon">

        <Icon
          size={36}
          strokeWidth={1.8}
          aria-hidden="true"
        />

      </span>


      {/* 02. VERTICAL DIVIDER */}

      <span
        className="cv-action-divider"
        aria-hidden="true"
      />


      {/* 03. ACTION CONTENT */}

      <span className="cv-action-content">

        <span className="cv-action-title">
          {title}
        </span>

        <span className="cv-action-description">
          {description}
        </span>

      </span>


      {/* 04. NAVIGATION ARROW */}

      <ArrowRight
        className="cv-action-arrow"
        size={24}
        strokeWidth={2.5}
        aria-hidden="true"
      />

    </button>

  )

}

export default CVActionCard