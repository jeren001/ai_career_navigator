import { useState } from 'react'
import { apiErrorText, useLocale } from '../../lib/locale.js'

export default function ResumeAnalysis({ cvs, selected, repository, onBack }) {
  const { t } = useLocale()
  const [id, setId] = useState(selected?.id ?? '')
  const [target, setTarget] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [guidance, setGuidance] = useState(null)

  async function analyze(event) {
    event.preventDefault()
    if (busy || !id || !consent) return
    setConsent(false)
    setBusy(true)
    setError(null)
    setGuidance(null)
    try {
      const result = await repository.analyze(id, target)
      setGuidance(result.guidance)
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="cv-builder-placeholder">
      <button type="button" className="cv-builder-back-button" onClick={onBack} disabled={busy}>{t('Back', '返回')}</button>
      <h1>{t('Analyze CV', '分析简历')}</h1>
      <form onSubmit={analyze}>
        <fieldset disabled={busy}>
          <label>{t('Saved CV', '已保存的简历')}
            <select value={id} required onChange={(event) => { setId(event.target.value); setConsent(false); setGuidance(null) }}>
              <option value="">{t('Choose a CV', '选择简历')}</option>
              {cvs.map((cv) => <option key={cv.id} value={cv.id}>{cv.title}</option>)}
            </select>
          </label>
          <label>{t('Target role (optional)', '目标岗位（可选）')}
            <input value={target} maxLength={120} onChange={(event) => { setTarget(event.target.value); setConsent(false) }} />
          </label>
          <label>
            <input type="checkbox" checked={consent} disabled={!id} onChange={(event) => setConsent(event.target.checked)} />
            {t('I agree to share excerpts from this resume with the AI provider for this analysis.',
              '我同意为本次分析向 AI 服务提供方分享该简历的摘录。')}
          </label>
          <button className="cv-design-action" disabled={!id || !consent}
            type="submit">{t('Request feedback', '获取反馈')}</button>
        </fieldset>
      </form>
      {busy && <p role="status">{t('Analyzing CV…', '正在分析简历…')}</p>}
      {error && <p role="alert">{apiErrorText(error, t)}</p>}
      {guidance && (
        <section>
          <h2>{guidance.status === 'ai' ? t('AI suggestions', 'AI 建议') : t('Basic suggestions', '基础建议')}</h2>
          <ul>{guidance.suggestions.map(({ action, evidence }, index) => (
            <li key={index}>{action}{evidence?.quote && <blockquote>{evidence.quote}</blockquote>}</li>
          ))}</ul>
        </section>
      )}
    </section>
  )
}
