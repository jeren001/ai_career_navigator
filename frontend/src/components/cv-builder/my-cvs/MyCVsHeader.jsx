import { Link } from 'react-router-dom'
import { ChevronRight, Home, Plus } from 'lucide-react'

export default function MyCVsHeader({ onBack, onCreate }) {
  return (
    <header className="my-cvs-header">
      <nav className="create-cv-breadcrumb" aria-label="Breadcrumb">
        <Link to="/dashboard" className="create-cv-home-link" aria-label="Dashboard"><Home size={16} aria-hidden="true" /></Link>
        <ChevronRight size={14} aria-hidden="true" />
        <button type="button" className="create-cv-breadcrumb-button" onClick={onBack}>CV Builder</button>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">My CVs</span>
      </nav>
      <div className="my-cvs-heading">
        <div>
          <h1 id="my-cvs-title" className="recent-cvs-title">My CVs</h1>
          <p>Manage drafts and completed CVs in this browser tab. Signing out ends access to this local workspace.</p>
        </div>
        <button type="button" className="cv-navigation-next" onClick={onCreate}><Plus size={18} aria-hidden="true" /> Create CV</button>
      </div>
    </header>
  )
}
