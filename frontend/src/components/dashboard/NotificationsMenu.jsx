import { useEffect, useRef, useState } from 'react'
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { useSession } from '../../session/session.js'

export default function NotificationsMenu() {
  const { user, request } = useSession()
  const { t } = useLocale()
  const [notifications, setNotifications] = useState([])
  const [before, setBefore] = useState(null)
  const [busy, setBusy] = useState(!user.is_guest)
  const [error, setError] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const [marking, setMarking] = useState(null)
  const lifetime = useRef(null)

  useEffect(() => {
    if (user.is_guest) return
    const controller = new AbortController()
    lifetime.current = controller
    request('/api/notifications', { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setNotifications(data.notifications)
        setBefore(data.next_before)
      })
      .catch((failure) => { if (!controller.signal.aborted) setError(failure) })
      .finally(() => { if (!controller.signal.aborted) setBusy(false) })
    return () => controller.abort()
  }, [request, user.is_guest, attempt])

  async function loadOlder() {
    const { signal } = lifetime.current
    setBusy(true)
    setError(null)
    try {
      const data = await request(`/api/notifications?before=${before}`, { signal })
      if (signal.aborted) return
      setNotifications((current) => [...current, ...data.notifications])
      setBefore(data.next_before)
    } catch (failure) {
      if (!signal.aborted) setError(failure)
    } finally {
      if (!signal.aborted) setBusy(false)
    }
  }

  async function markRead(id) {
    const { signal } = lifetime.current
    setMarking(id)
    setError(null)
    try {
      await request(`/api/notifications/${id}/read`, { method: 'PATCH', signal })
      if (!signal.aborted) setNotifications((current) => current.map((item) => item.id === id ? { ...item, read_at: true } : item))
    } catch (failure) {
      if (!signal.aborted) setError(failure)
    } finally {
      if (!signal.aborted) setMarking(null)
    }
  }

  return (
    <div className="notification-dropdown">
      <h3>{t('Notifications', '通知')}</h3>
      {user.is_guest && <p>{t('Create an account to receive notifications.', '创建账户后即可接收通知。')}</p>}
      {busy && <p role="status">{t('Loading notifications…', '正在加载通知…')}</p>}
      {error && <p role="alert">{apiErrorText(error, t)}</p>}
      {!user.is_guest && !busy && !notifications.length && (error
        ? <button type="button" onClick={() => { setBusy(true); setError(null); setAttempt((value) => value + 1) }}>
          {t('Retry', '重试')}
        </button>
        : <p>{t('No notifications yet.', '暂无通知。')}</p>)}
      <ul className="account-notification-list">
        {notifications.map((item) => (
          <li key={item.id}>
            <p>{item.message}</p>
            {!item.read_at && <button type="button" disabled={marking !== null} onClick={() => markRead(item.id)}>
              {t('Mark as read', '标为已读')}
            </button>}
          </li>
        ))}
      </ul>
      {before !== null && <button type="button" disabled={busy} onClick={loadOlder}>{t('Load older', '加载更早通知')}</button>}
    </div>
  )
}
