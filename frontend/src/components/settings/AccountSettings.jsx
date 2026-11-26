import { useState } from 'react'
import { ChevronRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../../context/user.js'
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { useSession } from '../../session/session.js'

export default function AccountSettings() {
  const { profile, refreshProfile } = useUser()
  const { request, signOut } = useSession()
  const { t } = useLocale()
  const navigate = useNavigate()
  const [action, setAction] = useState(null)
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [verified, setVerified] = useState(false)

  const verification = action === 'email-verification'
  const changeEmail = action === 'email-change'
  const currentPassword = action === 'password' || (changeEmail && !sent)

  function choose(next) {
    setAction(next)
    setSent(false)
    setError(null)
    setVerified(false)
  }

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    const body = Object.fromEntries(fields)
    setBusy(true)
    setError(null)
    try {
      const path = action === 'password' ? '/password/change' : `/${action}/${sent ? 'confirm' : 'request'}`
      await request('/api/auth' + path, { method: 'POST', body })
      if (action === 'password' || (changeEmail && sent)) {
        signOut(action)
        navigate('/signin', { replace: true })
      } else if (verification && sent) {
        await refreshProfile()
        choose(null)
        setVerified(true)
      } else {
        setSent(true)
      }
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon"><UserRound size={24} /></div>
        <div>
          <h2>{t('Account Settings', '账户设置')}</h2>
          <p>{t('Manage your account and login information.', '管理账户和登录信息。')}</p>
        </div>
      </div>
      <div className="settings-divider" />
      <div className="settings-option">
        <div className="settings-option-icon"><Mail size={22} /></div>
        <div className="settings-option-content">
          <h3>{t('Email Address', '邮箱地址')}</h3>
          <p>{profile.email}</p>
          <p>{profile.emailVerified ? t('Verified', '已验证') : t('Not verified', '未验证')}</p>
        </div>
        {!profile.emailVerified && (
          <button type="button" className="settings-action-button" disabled={busy} onClick={() => choose('email-verification')}>
            {t('Verify Email', '验证邮箱')}
          </button>
        )}
        <button type="button" className="settings-action-button" disabled={busy} onClick={() => choose('email-change')}>
          {t('Change Email', '更改邮箱')} <ChevronRight size={17} />
        </button>
      </div>
      <div className="settings-divider" />
      <div className="settings-option">
        <div className="settings-option-icon"><LockKeyhole size={22} /></div>
        <div className="settings-option-content">
          <h3>{t('Password', '密码')}</h3>
          <p>{t('Manage your account password.', '管理账户密码。')}</p>
        </div>
        <button type="button" className="settings-action-button" disabled={busy} onClick={() => choose('password')}>
          {t('Change Password', '更改密码')} <ChevronRight size={17} />
        </button>
      </div>
      {verified && <p role="status">{t('Your email is verified.', '你的邮箱已验证。')}</p>}
      {action && (
        <form key={action + sent} className="settings-delete-confirmation" onSubmit={submit}>
          {changeEmail && !sent && (
            <label>{t('New email address', '新邮箱地址')}
              <input name="email" type="email" required maxLength={254} autoComplete="email" disabled={busy} />
            </label>
          )}
          {currentPassword && (
            <label>{t('Current password', '当前密码')}
              <input name="current_password" type="password" required minLength={10} maxLength={128}
                autoComplete="current-password" disabled={busy} />
            </label>
          )}
          {action === 'password' && (
            <label>{t('New password', '新密码')}
              <input name="new_password" type="password" required minLength={10} maxLength={128}
                autoComplete="new-password" disabled={busy} />
            </label>
          )}
          {sent && (
            <label>{t('Enter the 8-digit code sent to your email.', '请输入邮箱收到的 8 位验证码。')}
              <input name="code" type="text" inputMode="numeric" pattern="[0-9]{8}" maxLength={8}
                autoComplete="one-time-code" required disabled={busy} />
            </label>
          )}
          {error && <p role="alert">{apiErrorText(error, t, sent ? 'code' : '')}</p>}
          <div className="settings-confirmation-actions">
            <button type="button" className="settings-cancel-button" disabled={busy} onClick={() => choose(null)}>
              {t('Cancel', '取消')}
            </button>
            <button type="submit" className="settings-action-button" disabled={busy}>
              {busy ? t('Please wait…', '请稍候…') : sent || action === 'password'
                ? t('Confirm', '确认') : t('Send code', '发送验证码')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
