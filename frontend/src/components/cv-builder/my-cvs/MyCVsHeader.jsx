import { useLocale } from '../../../lib/locale.js'
import { cvLabel } from '../cvLabels.js'
import { Link } from 'react-router-dom'
import { ChevronRight, Plus, UserRound } from 'lucide-react'

export default function MyCVsHeader({ onBack, onCreate }) {
  const { locale } = useLocale()
  const label = (value) => cvLabel(value, locale)
  return (
    <header className="my-cvs-header">
      <nav className="create-cv-breadcrumb" aria-label={label('Breadcrumb')}>
        <Link to="/" className="create-cv-breadcrumb-button">{label('Home')}</Link>
        <ChevronRight size={14} aria-hidden="true" />
        <button type="button" className="create-cv-breadcrumb-button" onClick={onBack}>{label('CV Builder')}</button>
        <ChevronRight size={14} aria-hidden="true" />
        <span aria-current="page">{label('My CVs')}</span>
      </nav>
      <div className="my-cvs-heading">
        <div>
          <h1 id="my-cvs-title">{label('My CVs')}</h1>
          <p>{label('Manage the resumes saved to your account.')}</p>
        </div>
        <button type="button" className="my-cvs-create" onClick={onCreate}><Plus size={18} aria-hidden="true" /> {label('Create CV')}</button>
      </div>
      <div className="my-cvs-illustration" aria-hidden="true">
        <div className="my-cvs-illustration-sheet my-cvs-illustration-back" />
        <div className="my-cvs-illustration-sheet">
          <UserRound size={30} />
          <i /><i /><i /><i /><i /><i /><i />
        </div>
      </div>
    </header>
  )
}
