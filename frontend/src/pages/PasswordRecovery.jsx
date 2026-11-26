import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { apiErrorText, useLocale } from '../lib/locale.js'
import { useSession } from '../session/session.js'
import '../styles/signin.css'

export default function PasswordRecovery() {
  const { locale, language, setLanguage, t } = useLocale()
  const { signOut } = useSession()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(event) {
    event.preventDefault()
    if (busy) return
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError(null)
    try {
      if (!sent) {
        await api('/api/auth/password-reset/request', { method: 'POST', body: { email: email.trim(), language: locale } })
        setSent(true)
      } else {
        await api('/api/auth/password-reset/confirm', {
          method: 'POST', body: { email: email.trim(), code: fields.get('code'), new_password: fields.get('new_password') }
        })
        signOut('password')
        navigate('/signin', { replace: true })
      }
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="signin-page account-recovery">
      <div className="signin-card">
        <div role="group" aria-label={t('Display language', '显示语言')}>
          <button type="button" aria-pressed={language === 'EN'} onClick={() => setLanguage('EN')}>EN</button>
          <button type="button" aria-pressed={language === 'CH'} onClick={() => setLanguage('CH')}>CH</button>
        </div>
        <h1>{t('Reset your password', '重置密码')}</h1>
        <form className="signin-form" onSubmit={submit}>
          <label>{t('Email address', '邮箱地址')}
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)}
              required maxLength={254} disabled={busy || sent} />
          </label>
          {sent && (
            <>
              <p role="status">{t('If this email is registered, a code will be sent when email delivery is available.', '如果该邮箱已注册，邮件服务可用时会发送验证码。')}</p>
              <label>{t('8-digit code', '8 位验证码')}
                <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{8}"
                  maxLength={8} required disabled={busy} />
              </label>
              <label>{t('New password', '新密码')}
                <input name="new_password" type="password" autoComplete="new-password" minLength={10}
                  maxLength={128} required disabled={busy} />
              </label>
            </>
          )}
          {error && <p role="alert">{apiErrorText(error, t, sent ? 'code' : '')}</p>}
          <button type="submit" className="signin-submit" disabled={busy}>
            {busy ? t('Please wait…', '请稍候…') : sent ? t('Reset Password', '重置密码') : t('Send code', '发送验证码')}
          </button>
          {sent && <button type="button" disabled={busy} onClick={() => { setSent(false); setError(null) }}>
            {t('Start over', '重新开始')}
          </button>}
          <Link to="/signin">{t('Back to Sign In', '返回登录')}</Link>
        </form>
      </div>
    </main>
  )
}
