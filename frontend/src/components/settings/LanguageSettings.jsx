import { Check, Globe } from 'lucide-react'
import { useUser } from '../../context/user.js'
import { useLocale } from '../../lib/locale.js'

function LanguageSettings() {
  const { t } = useLocale()
  const { settings, settingsSaving, updateSettings } = useUser()
  const language = settings.preferred_language === 'zh-CN' ? 'CH' : 'EN'
  const languages = [
    { code: 'EN', name: t('English', '英语'), nativeName: 'English' },
    { code: 'CH', name: t('Chinese', '中文'), nativeName: '简体中文' }
  ]

  return (
    <section className="settings-card">
      <div className="settings-card-header">
        <div className="settings-card-icon">
          <Globe size={24} />
        </div>
        <div>
          <h2>{t('Language Preferences', '语言偏好')}</h2>
          <p>{t('Choose your preferred display language.', '选择你偏好的显示语言。')}</p>
        </div>
      </div>

      <div className="settings-language-list">
        {languages.map(({ code, name, nativeName }) => (
          <button
            key={code}
            type="button"
            aria-pressed={code === language}
            className={`settings-language-option ${code === language ? 'active' : ''}`}
            disabled={settingsSaving}
            onClick={() => updateSettings({ preferred_language: code === 'CH' ? 'zh-CN' : 'en' })}
          >
            <span className="settings-language-code">{code}</span>
            <div className="settings-option-content">
              <h3>{name}</h3>
              {nativeName !== name && <p>{nativeName}</p>}
            </div>
            {code === language && <Check size={20} className="settings-language-check" />}
          </button>
        ))}
      </div>
    </section>
  )
}

export default LanguageSettings
