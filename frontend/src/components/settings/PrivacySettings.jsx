import { LockKeyhole, Shield } from 'lucide-react'
import CustomDropdown from '../common/CustomDropdown'
import { useUser } from '../../context/user.js'
import { useLocale } from '../../lib/locale.js'

const fields = [
  ['profile_photo', 'Profile Photo', '头像'], ['first_name', 'First Name', '名'],
  ['last_name', 'Last Name', '姓'], ['username', 'Username', '用户名'],
  ['country', 'Country', '国家'], ['city', 'City', '城市'],
  ['current_status', 'Current Status', '当前状态'], ['career_goals', 'Career Goal', '职业目标'],
  ['about_me', 'About Me', '关于我']
]

export default function PrivacySettings() {
  const { settings, settingsSaving, updateSettings } = useUser()
  const { t } = useLocale()
  const options = [
    { value: 'private', label: t('Only Me', '仅自己可见') }, { value: 'public', label: t('Public', '公开') }
  ]
  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon"><Shield size={24} /></div>
        <div>
          <h2>{t('Privacy & Visibility', '隐私与可见性')}</h2>
          <p>{t('Choose which information to share on your public profile.', '选择要在公开资料中分享的信息。')}</p>
        </div>
      </div>
      <div className="settings-divider" />
      <div className="settings-privacy-list">
        {fields.map(([key, en, zh]) => (
          <div key={key} className="settings-privacy-row">
            <CustomDropdown label={t(en, zh)} options={options} value={settings.privacy_settings[key]}
              disabled={settingsSaving} searchable={false} onChange={(value) => updateSettings({ privacy_settings: { [key]: value } })} />
          </div>
        ))}
      </div>
      <div className="settings-divider" />
      <div className="settings-private-information">
        <LockKeyhole size={20} />
        <div>
          <h3>{t('Always Private', '始终保密')}</h3>
          <p>{t('Your email and date of birth are always private.', '你的邮箱和出生日期始终保密。')}</p>
        </div>
      </div>
    </section>
  )
}
