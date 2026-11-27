import { useEffect, useState } from 'react'
import { useUser } from '../context/UserContext'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import CVBuilderHeader from '../components/cv-builder/CVBuilderHeader'
import CVBuilderActions from '../components/cv-builder/CVBuilderActions'
import RecentCVs from '../components/cv-builder/RecentCVs'
import MyCVs from '../components/cv-builder/MyCVs'
import CreateCV from '../components/cv-builder/create-cv/CreateCV'
import SavedCVExport from '../components/cv-builder/create-cv/studio/export/SavedCVExport'
import { cvRepository } from '../services/cvRepository'
import '../styles/cv-builder.css'

function CVBuilder() {
  const { profile } = useUser()
  const [cvs, setCVs] = useState([])
  const [activeView, setActiveView] = useState('home')
  const [exporting, setExporting] = useState(null)
  const [editing, setEditing] = useState(null)
  const [returnView, setReturnView] = useState('home')
  const [message, setMessage] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const records = await cvRepository.list()
        if (mounted) {
          setCVs(previous => {
            const merged = new Map(records.map(cv => [cv.id, cv]))
            for (const cv of previous) merged.set(cv.id, cv)
            return [...merged.values()]
          })
          setLoadState('ready')
        }
      } catch {
        if (mounted) setLoadState('error')
      }
    }
    load()
    return () => { mounted = false }
  }, [loadAttempt])

  function openEditor(record = null) {
    setReturnView(activeView)
    setEditing(record)
    setMessage('')
    setActiveView('create')
    window.scrollTo(0, 0)
  }

  async function saveCV(record) {
    const saved = await cvRepository.save(record)
    setCVs(previous => [saved, ...previous.filter(cv => cv.id !== saved.id)])
    const wasComplete = editing && editing.status !== 'draft'
    setMessage(saved.status === 'draft' ? 'Draft saved.' : wasComplete ? 'CV updated.' : 'CV created.')
    setActiveView('my-cvs')
    window.scrollTo(0, 0)
  }

  const cardActions = {
    onEdit: id => {
      const record = cvs.find(cv => cv.id === id)
      if (record) openEditor(record)
    },
    onDownload: id => {
      const record = cvs.find(cv => cv.id === id)
      if (record?.data) setExporting(record)
      else setMessage('This record has no CV content to export.')
    },
    onOpenMenu: () => setMessage('More CV actions will be available in a later update.')
  }

  return (
    <DashboardLayout>
      <div className="cv-builder-page">
        {activeView !== 'create' && (
          <>
            {message && <p className="cv-builder-feedback" role="status">{message}</p>}
            {loadState === 'loading' && <p role="status">Loading saved CVs…</p>}
            {loadState === 'error' && (
              <div className="cv-builder-feedback">
                <p role="alert">Saved CVs could not be loaded from this browser.</p>
                <button type="button" className="cv-builder-back-button" onClick={() => {
                  setLoadState('loading')
                  setLoadAttempt(attempt => attempt + 1)
                }}>Retry</button>
              </div>
            )}
          </>
        )}
        {activeView === 'home' && (
          <>
            <CVBuilderHeader />
            <CVBuilderActions onActionSelect={action => action === 'create' ? openEditor() : setActiveView(action)} />
            <RecentCVs cvs={cvs} onViewAll={() => setActiveView('my-cvs')} {...cardActions} />
          </>
        )}
        {activeView === 'create' && (
          <CreateCV key={editing?.id ?? 'new'} profile={profile} record={editing}
            onBack={() => setActiveView(returnView)} onSave={saveCV} />
        )}
        {activeView === 'my-cvs' && (
          <MyCVs cvs={cvs} onBack={() => setActiveView('home')} onCreate={() => openEditor()} {...cardActions} />
        )}
        {['analyze', 'optimize'].includes(activeView) && (
          <section className="cv-builder-placeholder">
            <button type="button" className="cv-builder-back-button" onClick={() => setActiveView('home')}>Back</button>
            <h1>{activeView === 'analyze' ? 'Analyze CV' : 'Optimize CV'}</h1>
            <p>This feature is under development.</p>
          </section>
        )}
        {exporting && <SavedCVExport record={exporting} onClose={() => setExporting(null)} />}
      </div>
    </DashboardLayout>
  )
}

export default CVBuilder
