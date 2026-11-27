
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Studio Navigation
// PURPOSE: Manage CV design studio navigation
// ==========================================


// Import navigation icons

import {
  LayoutTemplate,
  Palette,
  Layers,
  Globe
} from 'lucide-react'


// ==========================================
// 01. NAVIGATION ITEMS
// ==========================================

const navigationItems = [

  {
    id: 'templates',
    label: 'Templates',
    icon: LayoutTemplate
  },

  {
    id: 'design',
    label: 'Design',
    icon: Palette
  },

  {
    id: 'sections',
    label: 'Sections',
    icon: Layers
  },

  {
    id: 'international',
    label: 'International Format',
    icon: Globe
  }

]


// ==========================================
// 02. STUDIO NAVIGATION COMPONENT
// ==========================================

function StudioNavigation({

  activePanel = 'templates',
  onPanelChange,
  panelId

}) {

  return (

    <nav
      className="cv-studio-navigation"
      aria-label="CV design studio navigation"
    >

      {navigationItems.map(item => {

        const Icon = item.icon

        const isActive = activePanel === item.id

        return (

          <button
            key={item.id}
            type="button"
            className={`cv-studio-nav-item ${
              isActive ? 'active' : ''
            }`}
            aria-pressed={isActive}
            aria-controls={panelId}
            onClick={() => onPanelChange(item.id)}
          >

            <Icon
              size={21}
              strokeWidth={1.8}
              aria-hidden="true"
            />

            <span className="cv-studio-nav-label">
              {item.label}
            </span>

          </button>

        )

      })}

    </nav>

  )

}


export default StudioNavigation
