import { useEffect, useRef, useState } from 'react'
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { useSession } from '../../session/session.js'
import { listAssistantResumes, supportsResumeContext } from '../../services/assistantService.js'

export default function ResumeConsent({ selection, onChange, disabled }) {
  const { request } = useSession()
  const { locale, t } = useLocale()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [items, setItems] = useState([])
  const [offset, setOffset] = useState(null)
  const controllerRef = useRef(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  async function load(next = 0) {
    if (controllerRef.current) return
    const controller = new AbortController()
    controllerRef.current = controller
    const { signal } = controller
    setStatus('loading')
    setError(null)
    try {
      if (next === 0 && !await supportsResumeContext(request, signal)) {
        if (!signal.aborted) setStatus('unsupported')
        return
      }
      const data = await listAssistantResumes(request, next, signal)
      if (signal.aborted) return
      setItems((previous) => next === 0 ? data.resumes
        : [...new Map([...previous, ...data.resumes].map((item) => [item.id, item])).values()])
      setOffset(data.next_offset)
      setStatus('ready')
    } catch (failure) {
      if (!signal.aborted) {
        setError(failure)
        setStatus('error')
      }
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null
    }
  }

  function toggle() {
    setOpen(!open)
    if (open) onChange({ id: '', consent: false })
    else if (status === 'idle' || status === 'unsupported' || status === 'error') void load()
  }

  return (
    <div className="assistant-resume">
      <button type="button" aria-expanded={open} disabled={disabled} onClick={toggle}>
        {open ? t('Close resume options', '关闭简历选项') : t('Use a saved resume', '使用已保存的简历')}
      </button>
      {open && (
        <div className="assistant-resume-options">
          {status === 'loading' && <p role="status">{t('Loading saved resumes…', '正在加载已保存的简历…')}</p>}
          {status === 'unsupported' && <p>{t('This backend does not support resume context yet.', '当前后端暂不支持简历参考。')}</p>}
          {error && (
            <div>
              <p role="alert">{apiErrorText(error, t)}</p>
              <button type="button" disabled={disabled} onClick={() => load()}>{t('Retry', '重试')}</button>
            </div>
          )}
          {status === 'ready' && items.length === 0 && <p>{t('No saved resumes found.', '未找到已保存的简历。')}</p>}
          {items.length > 0 && (
            <>
              <label>
                {t('Saved resume', '已保存的简历')}
                <select aria-label={t('Saved resume', '已保存的简历')} value={selection.id} disabled={disabled || status === 'loading'}
                  onChange={(event) => onChange({ id: event.target.value, consent: false })}>
                  <option value="">{t('Choose a resume', '选择简历')}</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title} ({new Date(item.updated_at).toLocaleDateString(locale)})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <input type="checkbox" checked={selection.consent}
                  disabled={disabled || status !== 'ready' || !selection.id}
                  onChange={(event) => onChange({ id: selection.id, consent: event.target.checked })} />
                {t('I agree to share excerpts from this resume with the AI provider for this message only.',
                  '我同意仅在本条消息中向 AI 服务提供方分享这份简历的摘录。')}
              </label>
              {offset !== null && <button type="button" disabled={disabled || status === 'loading'} onClick={() => load(offset)}>
                {t('Load more resumes', '加载更多简历')}
              </button>}
            </>
          )}
        </div>
      )}
    </div>
  )
}
