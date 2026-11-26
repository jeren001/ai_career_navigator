import { useState } from 'react'
import { ShieldAlert, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { useSession } from '../../session/session.js'

export default function DeleteAccount() {
  const { t } = useLocale()
  const { request, signOut } = useSession()
  const navigate = useNavigate()
  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function remove(event) {
    event.preventDefault()
    if (busy || confirmation !== 'DELETE') return
    const currentPassword = new FormData(event.currentTarget).get('current_password')
    setBusy(true)
    setError(null)
    try {
      await request('/api/auth/account', { method: 'DELETE', body: { current_password: currentPassword, confirmation } })
      signOut('deleted')
      navigate('/signin', { replace: true })
    } catch (failure) {
      setError(failure)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon danger"><Trash2 size={24} /></div>
        <div>
          <h2>{t('Delete Account', '删除账户')}</h2>
          <p>{t('Permanently delete your account and associated data.', '永久删除账户及关联数据。')}</p>
        </div>
      </div>
      <div className="settings-divider" />
      <div className="settings-danger-notice">
        <ShieldAlert size={24} />
        <p>{t('This action cannot be undone.', '此操作无法撤销。')}</p>
      </div>
      <div className="settings-delete-information">
        <h3>{t('Data removed with your account', '删除账户时移除的数据')}</h3>
        <ul>
          <li>{t('Profile and account preferences', '个人资料与账户偏好')}</li>
          <li>{t('Saved assessments, skills, and practice history', '已保存的测评、技能与练习记录')}</li>
          <li>{t('Saved roadmaps and resumes', '已保存的路线图与简历')}</li>
        </ul>
      </div>
      {!confirming ? (
        <button type="button" className="settings-delete-button" onClick={() => setConfirming(true)}>
          <Trash2 size={18} /> {t('Delete My Account', '删除我的账户')}
        </button>
      ) : (
        <form className="settings-delete-confirmation" onSubmit={remove}>
          <div className="settings-confirmation-heading">
            <ShieldAlert size={24} />
            <h3>{t('Confirm Account Deletion', '确认删除账户')}</h3>
          </div>
          <label>{t('Type DELETE to confirm', '输入 DELETE 以确认')}
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy}
              autoComplete="off" spellCheck={false} required />
          </label>
          <label>{t('Current password', '当前密码')}
            <input name="current_password" type="password" autoComplete="current-password"
              minLength={10} maxLength={128} required disabled={busy} />
          </label>
          {error && <p role="alert">{apiErrorText(error, t)}</p>}
          <div className="settings-confirmation-actions">
            <button type="button" className="settings-cancel-button" disabled={busy} onClick={() => {
              setConfirmation('')
              setError(null)
              setConfirming(false)
            }}>{t('Cancel', '取消')}</button>
            <button type="submit" className="settings-delete-button" disabled={busy || confirmation !== 'DELETE'}>
              {busy ? t('Deleting…', '正在删除…') : t('Permanently Delete', '永久删除')}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
