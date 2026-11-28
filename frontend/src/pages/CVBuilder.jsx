import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { useUser } from '../context/UserContext'
import { useNotifications } from '../context/useNotifications'
import { getCVNotificationTarget, unavailableCVMessage } from '../components/cv-builder/cvNotificationNavigation'
import { isCVWorkspaceActive } from '../services/cvWorkspace'
import { createCVNotification } from '../components/cv-builder/cvNotificationEvents'
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
  const { publish, markAsRead, notifications } = useNotifications()
  const location = useLocation()
  const navigationType = useNavigationType()
  const notificationRequest = location.state?.cvNotification
  const handledNotification = useRef(null)
  const workspace = useRef(null)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notificationEditKey, setNotificationEditKey] = useState(null)
  const [notificationError, setNotificationError] = useState('')
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

  const finishNotificationOpen = useEffectEvent((record, notificationId, navigationKey) => {
    if (!notifications.some(item => item.id === notificationId && getCVNotificationTarget(item)?.id === record.id)) return

    setNotificationError('')
    setMessage('')
    setNotificationsOpen(false)

    if (record.status === 'draft') {
      openEditor(record, 'my-cvs', navigationKey)
    } else {
      setActiveView('my-cvs')
      setDialog({ record, action: 'view', fromNotification: true })
      window.scrollTo(0, 0)
    }

    markAsRead(notificationId)
  })

  useEffect(() => {
    // Only handle a fresh router navigation, never a reload or history replay.
    if (!notificationRequest || navigationType === 'POP' || handledNotification.current === location.key) return

    const target = getCVNotificationTarget(notificationRequest)
    if (!target || notificationRequest.workspaceId !== workspaceId || !isCVWorkspaceActive(workspaceId)) return

    let cancelled = false
    async function open() {
      let record
      try {
        record = await cvRepository.get(workspaceId, target.id)
      } catch {
        record = null
      }

      if (cancelled || !isCVWorkspaceActive(workspaceId)) return
      handledNotification.current = location.key
      if (!record?.data) {
        setNotificationError(unavailableCVMessage)
        return
      }
      finishNotificationOpen(record, notificationRequest.notificationId, location.key)
    }
    open()
    return () => { cancelled = true }
  }, [location.key, navigationType, notificationRequest, workspaceId])

  useEffect(() => {
    if (notificationEditKey && activeView === 'create') {
      workspace.current?.querySelector('.create-cv-breadcrumb-button')?.focus()
    }
  }, [activeView, notificationEditKey])

  function upsert(saved) {
    revision.current++
    setCVs(previous => [saved, ...previous.filter(cv => cv.id !== saved.id)])
  }

  function openEditor(record = null, backTo = activeView, editorKey = null) {
    setDialog(null)
    setReturnView(backTo)
    setEditing(record)
    setNotificationEditKey(editorKey)
    setNotificationError('')
    setMessage('')
    setActiveView('create')
    window.scrollTo(0, 0)
  }

  function closeViewer() {
    setDialog(null)
    if (dialog?.fromNotification) {
      requestAnimationFrame(() => {
        workspace.current?.parentElement.querySelector('.notification-bell-trigger')?.focus()
      })
    }
  }

  async function saveCV(record) {
    const saved = await cvRepository.save(workspaceId, record, Boolean(editing))
    upsert(saved)
    const wasComplete = editing && editing.status !== 'draft'
    const type = saved.status === 'draft' ? 'cv.draftSaved' : wasComplete ? 'cv.updated' : 'cv.created'
    publish(createCVNotification(type, saved.id))
    setActiveView('my-cvs')
    window.scrollTo(0, 0)
  }

  async function manage(action, id, name) {
    if (action === 'delete') {
      await cvRepository.remove(workspaceId, id)
      revision.current++
      setCVs(previous => previous.filter(cv => cv.id !== id))
      publish(createCVNotification('cv.deleted'))
    } else {
      const saved = await cvRepository.rename(workspaceId, id, name)
      upsert(saved)
      publish(createCVNotification('cv.renamed', saved.id))
    }
  }

  async function duplicate(record) {
    if (duplication.current.has(record.id)) return
    duplication.current.add(record.id)
    setManagementError('')
    setMessage('')
    try {
      const saved = await cvRepository.duplicate(workspaceId, record.id)
      upsert(saved)
      publish(createCVNotification('cv.duplicated', saved.id))
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
    <div className={activeView === 'my-cvs' ? 'cv-builder-page cv-builder-library' : 'cv-builder-page'}>
      <CVBuilderHeader isHome={activeView === 'home'} notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen} />
      <main ref={workspace} className="cv-builder-workspace">
        {notificationError && <p role="status" className="cv-builder-feedback">{notificationError}</p>}
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
          <CreateCV key={notificationEditKey ?? editing?.id ?? 'new'} profile={profile} record={editing}
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
        {dialog?.action === 'view' && <CVViewer cv={dialog.record} onClose={closeViewer} onEdit={openEditor} />}
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
