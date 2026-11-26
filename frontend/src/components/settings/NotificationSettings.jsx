import { Bell } from 'lucide-react'
import { useUser } from '../../context/user.js'
import { useLocale } from '../../lib/locale.js'

const options = [
  ['career_recommendations', 'Career Recommendations', '职业推荐', 'Get notified when your career recommendations are ready.', '职业推荐生成后收到通知。'],
  ['job_alerts', 'Job & Internship Alerts', '工作与实习提醒', 'Save your preference for job and internship alerts.', '保存工作和实习提醒偏好。'],
  ['learning_reminders', 'Learning Reminders', '学习提醒', 'Save your preference for learning reminders.', '保存学习提醒偏好。'],
  ['roadmap_updates', 'Career Roadmap Updates', '职业路线图更新', 'Get notified when a roadmap is ready or a milestone is completed.', '路线图生成或完成里程碑时收到通知。'],
  ['platform_updates', 'Platform Updates', '平台更新', 'Save your preference for platform updates.', '保存平台更新偏好。'],
  ['email_notifications', 'Email Notifications', '邮件通知', 'Save your email notification preference.', '保存邮件通知偏好。']
]

export default function NotificationSettings() {
  const { settings, settingsSaving, updateSettings } = useUser()
  const { t } = useLocale()
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon"><Bell size={24} /></div>
        <div>
          <h2>{t('Notification Preferences', '通知偏好')}</h2>
          <p>{t('Choose which notifications you want to receive.', '选择希望接收的通知。')}</p>
        </div>
      </div>
      <div className="settings-divider" />
      <div className="settings-notification-list">
        {options.map(([key, en, zh, description, descriptionZh]) => {
          const enabled = settings.notification_settings[key]
          return (
            <div key={key} className="settings-notification-row">
              <div className="settings-option-content">
                <h3>{t(en, zh)}</h3>
                <p>{t(description, descriptionZh)}</p>
              </div>
              <button type="button" role="switch" aria-label={t(en, zh)} aria-checked={enabled}
                disabled={settingsSaving} className={`settings-toggle ${enabled ? 'active' : ''}`}
                onClick={() => updateSettings({ notification_settings: { [key]: !enabled } })}>
                <span className="settings-toggle-thumb" />
              </button>
            </div>
          )
        })}
      </div>
      <p className="settings-privacy-disclaimer">
        {t('Career recommendations and roadmap updates are delivered in the app. The other preferences are saved for future delivery.', '职业推荐和路线图更新通过应用内通知发送。其他偏好将保留，供未来启用通知时使用。')}
      </p>
    </section>
  )
}
