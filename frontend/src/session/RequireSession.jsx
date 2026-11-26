import { Navigate } from 'react-router-dom'
import { apiErrorText, useLocale } from '../lib/locale.js'
import { useSession } from './session.js'

export default function RequireSession({ children }) {
  const { status, error, restoreSession, signOut } = useSession()
  const { t } = useLocale()

  if (status === 'loading') {
    return <main className="integration-status" role="status">{t('Checking your session…', '正在验证会话…')}</main>
  }
  if (status === 'error') {
    return (
      <main className="integration-status">
        <p role="alert">{apiErrorText(error, t)}</p>
        <button onClick={() => void restoreSession()}>{t('Retry', '重试')}</button>{' '}
        <button onClick={signOut}>{t('Return to sign in', '返回登录')}</button>
      </main>
    )
  }
  return status === 'authenticated'
    ? children
    : <Navigate to="/signin" replace />
}
