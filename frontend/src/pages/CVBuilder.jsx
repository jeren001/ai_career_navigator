import { useEffect, useRef, useState } from 'react'
import { useUser } from '../context/UserContext'
import CVBuilderHeader from '../components/cv-builder/CVBuilderHeader'
import CVBuilderActions from '../components/cv-builder/CVBuilderActions'
import RecentCVs from '../components/cv-builder/RecentCVs'
import MyCVs from '../components/cv-builder/my-cvs/MyCVs'
import CVManagementDialog from '../components/cv-builder/my-cvs/CVManagementDialog'
import CVViewer from '../components/cv-builder/my-cvs/CVViewer'
import CreateCV from '../components/cv-builder/create-cv/CreateCV'
import DOCXExportDialog from '../components/cv-builder/create-cv/studio/export/DOCXExportDialog'
import SavedCVExport from '../components/cv-builder/create-cv/studio/export/SavedCVExport'
import { getSavedDocument } from '../components/cv-builder/create-cv/studio/preview/savedDocument'
import { cvRepository } from '../services/cvRepository'
import '../styles/cv-builder.css'
import '../styles/my-cvs.css'

function CVBuilderWorkspace({ profile, workspaceId }) {
  const [cvs, setCVs] = useState([])
  const [activeView, setActiveView] = useState('home')
  const [dialog, setDialog] = useState(null)
  const [editing, setEditing] = useState(null)
  const [featureCV, setFeatureCV] = useState(null)
  const [returnView, setReturnView] = useState('home')
  const [message, setMessage] = useState('')
  const [managementError, setManagementError] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [loadAttempt, setLoadAttempt] = useState(0)
  const revision = useRef(0)
  const duplication = useRef(new Set())

  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        let records
        let before
        do {
          before = revision.current
          records = await cvRepository.list(workspaceId)
        } while (mounted && before !== revision.current)
        if (mounted) {
          setCVs(records)
          setLoadState('ready')
        }
      } catch {
        if (mounted) setLoadState('error')
      }
    }
    load()
    return () => { mounted = false }
  }, [loadAttempt, workspaceId])

  function upsert(saved) {
    revision.current++
    setCVs(previous => [saved, ...previous.filter(cv => cv.id !== saved.id)])
  }

  function openEditor(record = null) {
    setDialog(null)
    setReturnView(activeView)
    setEditing(record)
    setMessage('')
    setActiveView('create')
    window.scrollTo(0, 0)
  }

  async function saveCV(record) {
    const saved = await cvRepository.save(workspaceId, record, Boolean(editing))
    upsert(saved)
    const wasComplete = editing && editing.status !== 'draft'
    setMessage(saved.status === 'draft' ? 'Draft saved.' : wasComplete ? 'CV updated.' : 'CV created.')
    setActiveView('my-cvs')
    window.scrollTo(0, 0)
  }

  async function manage(action, id, name) {
    if (action === 'delete') {
      await cvRepository.remove(workspaceId, id)
      revision.current++
      setCVs(previous => previous.filter(cv => cv.id !== id))
      setMessage('CV deleted.')
    } else {
      upsert(await cvRepository.rename(workspaceId, id, name))
      setMessage('CV renamed.')
    }
  }

  async function duplicate(record) {
    if (duplication.current.has(record.id)) return
    duplication.current.add(record.id)
    setManagementError('')
    setMessage('')
    try {
      upsert(await cvRepository.duplicate(workspaceId, record.id))
      setMessage('CV duplicated.')
    } catch (failure) {
      setManagementError(failure?.message || 'The CV could not be duplicated. Please try again.')
    } finally {
      duplication.current.delete(record.id)
    }
  }

  function openFeature(action, record = null) {
    setFeatureCV(record)
    setReturnView(activeView)
    setActiveView(action)
  }

  const cardActions = {
    onEdit: id => {
      const record = cvs.find(cv => cv.id === id)
      if (record) openEditor(record)
    },
    onDownload: (id, format = 'pdf') => {
      const record = cvs.find(cv => cv.id === id)
      if (record?.data) setDialog({ record, action: format })
      else setMessage('This record has no CV content to export.')
    },
    onAction: (id, action) => {
      const record = cvs.find(cv => cv.id === id)
      if (!record) return
      if (action === 'analyze' || action === 'optimize') openFeature(action, record)
      else if (action === 'duplicate') duplicate(record)
      else if (action === 'view' && !record.data) setMessage('This record has no stored CV content to view.')
      else setDialog({ record, action })
    }
  }

  return (
    <div className="cv-builder-page">
      <CVBuilderHeader isHome={activeView === 'home'} />
      <main className="cv-builder-workspace">
        {activeView !== 'create' && (
          <>
            {message && <p className="cv-builder-feedback" role="status">{message}</p>}
            {managementError && <p className="cv-builder-feedback" role="alert">{managementError}</p>}
            {loadState === 'loading' && <p role="status">Loading saved CVs…</p>}
            {loadState === 'error' && (
              <div className="cv-builder-feedback">
                <p role="alert">{workspaceId ? 'Saved CVs could not be loaded from this browser.' : 'This browser could not open a private local CV workspace.'}</p>
                {workspaceId && <button type="button" className="cv-builder-back-button" onClick={() => {
                  setLoadState('loading')
                  setLoadAttempt(attempt => attempt + 1)
                }}>Retry</button>}
              </div>
            )}
          </>
        )}
        {activeView === 'home' && (
          <>
            <CVBuilderActions onActionSelect={action => {
              if (action === 'create') openEditor()
              else if (action === 'my-cvs') setActiveView(action)
              else openFeature(action)
            }} />
            <RecentCVs cvs={cvs} onViewAll={() => setActiveView('my-cvs')} {...cardActions} />
          </>
        )}
        {activeView === 'create' && (
          <CreateCV key={editing?.id ?? 'new'} profile={profile} record={editing}
            onBack={() => setActiveView(returnView)} onSave={saveCV} />
        )}
        {activeView === 'my-cvs' && (
          <MyCVs cvs={cvs} loading={loadState !== 'ready'} onBack={() => setActiveView('home')}
            onCreate={() => openEditor()} {...cardActions} />
        )}
        {['analyze', 'optimize'].includes(activeView) && (
          <section className="cv-builder-placeholder">
            <button type="button" className="cv-builder-back-button" onClick={() => setActiveView(returnView)}>Back</button>
            <h1>{activeView === 'analyze' ? 'Analyze CV' : 'Optimize CV'} · Coming soon</h1>
            {featureCV && <p>Selected CV <strong dir="auto">{featureCV.title || 'Untitled CV'}</strong></p>}
            <p>This feature is under development.</p>
          </section>
        )}
        {dialog?.action === 'pdf' && <SavedCVExport record={dialog.record} onClose={() => setDialog(null)} />}
        {dialog?.action === 'docx' && (
          <DOCXExportDialog title={dialog.record.title} cvData={getSavedDocument(dialog.record).cvData} onClose={() => setDialog(null)} />
        )}
        {dialog?.action === 'view' && <CVViewer cv={dialog.record} onClose={() => setDialog(null)} onEdit={openEditor} />}
        {['rename', 'delete'].includes(dialog?.action) && (
          <CVManagementDialog cv={dialog.record} action={dialog.action} onClose={() => setDialog(null)} onConfirm={manage} />
        )}
      </main>
    </div>
  )
}

export default function CVBuilder() {
  const { profile, cvWorkspace } = useUser()
  return <CVBuilderWorkspace key={cvWorkspace ?? 'unavailable'} workspaceId={cvWorkspace} profile={profile} />
}
