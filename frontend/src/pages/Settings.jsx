// ==========================================
// PROJECT: AI CAREER
// PAGE: Settings
// PURPOSE: Manage account, privacy and preferences
// ==========================================

// Import navigation tools
import { useSearchParams } from 'react-router-dom'

import { useUser } from '../context/user.js'
import { apiErrorText, useLocale } from '../lib/locale.js'

// Import shared dashboard layout
import DashboardLayout from '../components/dashboard/DashboardLayout'

// Import settings components
import SettingsNavigation from '../components/settings/SettingsNavigation'
import AccountSettings from '../components/settings/AccountSettings'
import PrivacySettings from '../components/settings/PrivacySettings'
import NotificationSettings from '../components/settings/NotificationSettings'
import LanguageSettings from '../components/settings/LanguageSettings'
import DeleteAccount from '../components/settings/DeleteAccount'

// Import page styles
import '../styles/settings.css'


// ==========================================
// 01. AVAILABLE SETTINGS SECTIONS
// ==========================================

const availableSections = [
  'account',
  'privacy',
  'notifications',
  'language',
  'delete-account'
]


function Settings() {

  const { t } = useLocale()
  const { settings, settingsLoading, settingsError, settingsSaveError, retrySettings } = useUser()

  // 03. URL SEARCH PARAMETERS

  const [searchParams, setSearchParams] = useSearchParams()

  const requestedSection = searchParams.get('section')


  // Validate the requested settings section

  const activeSection = availableSections.includes(requestedSection)
    ? requestedSection
    : 'account'


  // 04. CHANGE ACTIVE SECTION

  function handleSectionChange(section) {

    if (!availableSections.includes(section)) {
      return
    }

    setSearchParams(previous => {

      const updatedParams = new URLSearchParams(previous)

      updatedParams.set('section', section)

      return updatedParams

    })

  }


  // 05. RENDER SELECTED SECTION

  function renderSection() {

    if (['privacy', 'notifications', 'language'].includes(activeSection)) {
      if (settingsLoading) return <p role="status">{t('Loading settings…', '正在加载设置…')}</p>
      if (!settings && settingsError) return (
        <div>
          <p role="alert">{apiErrorText(settingsError, t)}</p>
          <button type="button" className="settings-action-button" onClick={retrySettings}>{t('Retry', '重试')}</button>
        </div>
      )
    }
    switch (activeSection) {

      case 'account':
        return <AccountSettings />

      case 'privacy':
        return <PrivacySettings />

      case 'notifications':
        return <NotificationSettings />

      case 'delete-account':
        return <DeleteAccount />

      case 'language':
        return <LanguageSettings />

      default:
        return <AccountSettings />

    }

  }


  // 06. SETTINGS PAGE INTERFACE

  return (

    <DashboardLayout>

      <section className="settings-page">

        {/* Page heading */}

        <div className="settings-page-heading">

          <h1>{t('Settings', '设置')}</h1>

          <p>{t('Manage your account, privacy and preferences.', '管理你的账户、隐私与偏好。')}</p>

        </div>


        {/* Settings layout */}

        <div className="settings-layout">

          {/* Settings navigation */}

          <aside className="settings-sidebar">

            <SettingsNavigation
              activeSection={activeSection}
              onSectionChange={handleSectionChange}
            />

          </aside>


          {/* Selected settings content */}

          <div className="settings-content">

            {settingsSaveError && <p role="alert">{apiErrorText(settingsSaveError, t)}</p>}
            {renderSection()}

          </div>

        </div>

      </section>

    </DashboardLayout>

  )

}

export default Settings
