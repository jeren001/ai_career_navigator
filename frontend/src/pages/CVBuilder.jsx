import { useEffect, useMemo, useRef, useState } from 'react'
import { useUser } from '../context/user.js'
import { useSession } from '../session/session.js'
import { apiErrorText, useLocale } from '../lib/locale.js'
import CVBuilderHeader from '../components/cv-builder/CVBuilderHeader'
import CVBuilderActions from '../components/cv-builder/CVBuilderActions'
import RecentCVs from '../components/cv-builder/RecentCVs'
import MyCVs from '../components/cv-builder/my-cvs/MyCVs'
import CVManagementDialog from '../components/cv-builder/my-cvs/CVManagementDialog'
import ResumeExtractionDialog from '../components/cv-builder/my-cvs/ResumeExtractionDialog'
import CVViewer from '../components/cv-builder/my-cvs/CVViewer'
import ResumeAnalysis from '../components/cv-builder/ResumeAnalysis'
import CreateCV from '../components/cv-builder/create-cv/CreateCV'
import DOCXExportDialog from '../components/cv-builder/create-cv/studio/export/DOCXExportDialog'
import SavedCVExport from '../components/cv-builder/create-cv/studio/export/SavedCVExport'
import { getSavedDocument } from '../components/cv-builder/create-cv/studio/preview/savedDocument'
import { createCVRepository } from '../services/cvRepository.js'
import '../styles/cv-builder.css'
import '../styles/my-cvs.css'

export default function CVBuilder() {
  const { profile } = useUser()
  const { request, user } = useSession()
  const { locale, t } = useLocale()
  const repository = useMemo(() => createCVRepository(request, user.id, locale), [request, user.id, locale])
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [cvs, setCVs] = useState([])
  const [activeView, setActiveView] = useState('home')
  const [dialog, setDialog] = useState(null)
  const [editing, setEditing] = useState(null)
  const [featureCV, setFeatureCV] = useState(null)
  const [returnView, setReturnView] = useState('home')
  const [message, setMessage] = useState('')
  const [error, setError] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState(false)
  const actionLock = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    repository.list(controller.signal).then((records) => {
      if (!controller.signal.aborted) {
        setCVs(records)
        setLoadState('ready')
      }
    }, (failure) => {
      if (!controller.signal.aborted) {
        setError(failure)
        setLoadState('error')
      }
    })
    return () => controller.abort()
  }, [attempt, repository])

  function upsert(saved) {
    setCVs((previous) => [saved, ...previous.filter((cv) => cv.id !== saved.id)])
    if (saved.localSaveFailed) setMessage(t('Saved online. This browser could not store the extra design fields.',
      '已在线保存。此浏览器无法保存额外的设计字段。'))
  }

  function openEditor(record = null) {
    setDialog(null)
    setReturnView(activeView)
    setEditing(record)
    setActiveView('create')
    window.scrollTo(0, 0)
  }

  async function saveCV(record) {
    upsert(await repository.save(record, Boolean(editing)))
    setActiveView('my-cvs')
    window.scrollTo(0, 0)
  }

  async function manage(action, id, name) {
    if (action === 'delete') {
      await repository.remove(id)
      setCVs((previous) => previous.filter((cv) => cv.id !== id))
    } else upsert(await repository.rename(id, name))
  }

  function feature(action, record = null) {
    setFeatureCV(record)
    setReturnView(activeView)
    setActiveView(action)
  }

  async function run(operation) {
    if (actionLock.current) return
    actionLock.current = true
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      await operation()
    } catch (failure) {
      setError(failure)
    } finally {
      actionLock.current = false
      setBusy(false)
    }
  }

  function openRecord(id, action) {
    return run(async () => {
      const record = await repository.get(id)
      if (action === 'edit') openEditor(record)
      else if (action === 'extraction') {
        const { extraction } = await repository.extraction(id)
        setDialog({ record, action, extraction })
      }
      else if (action === 'original') {
        const url = URL.createObjectURL(await repository.original(id))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = record.title.replace(/[<>:"/\\|?*]/g, '_') + (record.fileType === 'application/pdf' ? '.pdf' : '.docx')
        anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      } else if (action === 'duplicate') {
        const suffix = t(' (copy)', '（副本）')
        upsert(await repository.save({ ...record, title: [...record.title].slice(0, 120 - suffix.length).join('') + suffix }, false))
      } else if (action === 'analyze' || action === 'optimize') feature(action, record)
      else setDialog({ record, action })
    })
  }

  function upload(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024 || !['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
      setMessage(t('Choose a PDF or DOCX file up to 5 MiB.', '请选择不超过 5 MiB 的 PDF 或 DOCX 文件。'))
      return
    }
    void run(async () => {
      const { record, extraction } = await repository.upload(file)
      upsert(record)
      if (extraction) setDialog({ record, action: 'extraction', extraction })
    })
  }

  const cardActions = {
    onEdit: (id) => openRecord(id, 'edit'),
    onDownload: (id, format = 'pdf') => openRecord(id, format),
    onAction: openRecord
  }

  return (
    <div className={activeView === 'my-cvs' ? 'cv-builder-page cv-builder-library' : 'cv-builder-page'}>
      <CVBuilderHeader isHome={activeView === 'home'} notificationsOpen={notificationsOpen}
        onNotificationsOpenChange={setNotificationsOpen} />
      <main className="cv-builder-workspace">
        {activeView !== 'create' && message && <p className="cv-builder-feedback" role="status">{message}</p>}
        {activeView !== 'create' && error && <p className="cv-builder-feedback" role="alert">{apiErrorText(error, t)}</p>}
        {(loadState === 'loading' || busy) && <p role="status">{t('Loading CV data…', '正在加载简历数据…')}</p>}
        {loadState === 'error' && <button type="button" className="cv-builder-back-button" onClick={() => {
          setError(null)
          setLoadState('loading')
          setAttempt((previous) => previous + 1)
        }}>{t('Retry', '重试')}</button>}
        {['home', 'create'].includes(activeView) && (
          <p className="cv-builder-feedback">{t('Resume content, contact details, supported styling, and draft progress sync to your account. Extra layout options and photos stay in this browser.',
            '简历内容、联系方式、受支持的样式和草稿进度会同步到账户。其他布局设置和照片保存在此浏览器。')}</p>
        )}
        {activeView === 'home' && loadState === 'ready' && (
          <>
            <CVBuilderActions onActionSelect={(action) => {
              if (action === 'create') openEditor()
              else if (action === 'my-cvs') setActiveView(action)
              else feature(action)
            }} />
            <label className="cv-builder-feedback">{t('Upload a PDF or DOCX', '上传 PDF 或 DOCX')}
              <input type="file" accept=".pdf,.docx" disabled={busy || loadState === 'loading'} onChange={upload} />
            </label>
            {loadState === 'ready' && <RecentCVs cvs={cvs} onViewAll={() => setActiveView('my-cvs')} {...cardActions} />}
          </>
        )}
        {activeView === 'create' && <CreateCV key={editing?.id ?? 'new'} profile={profile}
          record={editing} onBack={() => setActiveView(returnView)} onSave={saveCV} />}
        {activeView === 'my-cvs' && <MyCVs cvs={cvs} loading={loadState === 'loading'} onBack={() => setActiveView('home')}
          onCreate={() => openEditor()} {...cardActions} />}
        {['analyze', 'optimize'].includes(activeView) && <ResumeAnalysis cvs={cvs} selected={featureCV}
          repository={repository} onBack={() => setActiveView(returnView)} />}
        {dialog?.action === 'extraction' && <ResumeExtractionDialog extraction={dialog.extraction}
          onClose={() => setDialog(null)} onApply={async (selection) => {
            const updated = await repository.applyExtraction(dialog.record.id, selection)
            upsert(updated)
            setDialog(null)
          }} />}
        {dialog?.action === 'pdf' && <SavedCVExport record={dialog.record} onClose={() => setDialog(null)} />}
        {dialog?.action === 'docx' && <DOCXExportDialog title={dialog.record.title}
          cvData={getSavedDocument(dialog.record).cvData} onClose={() => setDialog(null)} />}
        {dialog?.action === 'view' && <CVViewer cv={dialog.record} onClose={() => setDialog(null)} onEdit={openEditor} />}
        {['rename', 'delete'].includes(dialog?.action) && <CVManagementDialog cv={dialog.record} action={dialog.action}
          onClose={() => setDialog(null)} onConfirm={manage} />}
      </main>
    </div>
  )
}
