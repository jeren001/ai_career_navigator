import CVCard from './CVCard'
import CVEmptyState from './CVEmptyState'

export default function MyCVs({ cvs, onBack, onCreate, ...actions }) {
  const ordered = [...cvs].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  return (
    <section aria-labelledby="my-cvs-title">
      <div className="recent-cvs-header">
        <button type="button" className="cv-builder-back-button" onClick={onBack}>Back</button>
        <button type="button" className="cv-navigation-next" onClick={onCreate}>Create CV</button>
      </div>
      <h1 id="my-cvs-title" className="recent-cvs-title">My CVs</h1>
      {ordered.length === 0 ? <CVEmptyState /> : (
        <div className="recent-cvs-grid">
          {ordered.map(cv => <CVCard key={cv.id} cv={cv} {...actions} />)}
        </div>
      )}
    </section>
  )
}
