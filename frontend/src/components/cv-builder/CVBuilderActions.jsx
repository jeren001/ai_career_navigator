// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Builder Actions
// PURPOSE: Display main CV Builder actions
// ==========================================

// Import icons
import {
  FilePlus,
  ScanText,
  Sparkles,
  Folder
} from 'lucide-react'

// Import reusable action card
import CVActionCard from './CVActionCard'


// ==========================================
// 01. ACTION CONFIGURATION
// ==========================================

const cvActions = [
  {
    id: 'create',
    icon: FilePlus,
    title: 'Create CV',
    description: 'Build a professional CV from scratch.'
  },
  {
    id: 'analyze',
    icon: ScanText,
    title: 'Analyze CV',
    description: 'Check your CV quality and ATS compatibility.'
  },
  {
    id: 'optimize',
    icon: Sparkles,
    title: 'Optimize CV',
    description: 'Tailor your CV to a specific job opportunity.'
  },
  {
    id: 'my-cvs',
    icon: Folder,
    title: 'My CVs',
    description: 'Manage, edit and export your saved CVs.'
  }
]


// ==========================================
// 02. COMPONENT LAYOUT
// ==========================================

function CVBuilderActions({ onActionSelect }) {

  return (

    <section
      className="cv-builder-actions"
      aria-label="CV Builder actions"
    >

      {cvActions.map(action => (

        <CVActionCard
          key={action.id}
          icon={action.icon}
          title={action.title}
          description={action.description}
          onClick={() => onActionSelect(action.id)}
        />

      ))}

    </section>

  )

}


// ==========================================
// 03. EXPORT COMPONENT
// ==========================================

export default CVBuilderActions