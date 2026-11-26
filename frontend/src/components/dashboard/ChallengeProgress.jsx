import { useEffect, useState } from 'react'
import { api } from '../../lib/api.js'
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { useSession } from '../../session/session.js'

export default function ChallengeProgress() {
  const { locale, t } = useLocale()
  const { request } = useSession()
  const [state, setState] = useState({ status: 'loading' })
  const [titles, setTitles] = useState({})
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    request('/api/challenges/progress', { signal: controller.signal })
      .then(({ progress }) => {
        if (!controller.signal.aborted) setState({ status: 'ready', progress })
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: 'error', error })
      })
    return () => controller.abort()
  }, [request, retry])

  useEffect(() => {
    const controller = new AbortController()
    api(`/api/challenges?language=${locale}`, { signal: controller.signal })
      .then(({ challenges }) => {
        if (!controller.signal.aborted) {
          setTitles({ locale, byId: Object.fromEntries(challenges.map(({ id, title }) => [id, title])) })
        }
      })
      .catch(() => {
        // Progress is still available with its server-provided challenge IDs.
      })
    return () => controller.abort()
  }, [locale])

  return (
    <section className="integration-progress" aria-labelledby="progress-heading">
      <h2 id="progress-heading">{t('Challenge progress', '挑战进度')}</h2>
      {state.status === 'loading' && <p role="status">{t('Loading progress…', '正在加载进度…')}</p>}
      {state.status === 'error' && (
        <>
          <p role="alert">{apiErrorText(state.error, t)}</p>
          <button type="button" onClick={() => {
            setState({ status: 'loading' })
            setRetry((current) => current + 1)
          }}>{t('Retry', '重试')}</button>
        </>
      )}
      {state.status === 'ready' && (state.progress.length ? (
        <ul>{state.progress.map((entry) => (
          <li key={entry.challenge_id}>
            <strong>{(titles.locale === locale && titles.byId[entry.challenge_id]) || entry.challenge_id}</strong>{' '}
            <span>{t(`Submitted: ${entry.submitted_count} · Evaluated: ${entry.evaluated_count}`,
              `已提交：${entry.submitted_count} · 已评估：${entry.evaluated_count}`)}</span>
          </li>
        ))}</ul>
      ) : <p>{t('You have no challenge submissions yet.', '你还没有提交挑战成果。')}</p>)}
    </section>
  )
}
