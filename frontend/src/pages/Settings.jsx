// ==========================================
// PROJECT: AI CAREER
// PAGE: Settings
// PURPOSE: Manage account, privacy and preferences
// ==========================================

// Import navigation tools
import { useSearchParams } from 'react-router-dom'

// Import translation tools

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

  // 02. TRANSLATION TOOLS

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

    switch (activeSection) {

      case 'account':
        return <AccountSettings />

      case 'privacy':
        return <PrivacySettings />

      case 'notifications':
        return <NotificationSettings />

      case 'delete-account':
        return <DeleteAccount />

      default:
        return <AccountSettings />

        case 'language':
            return <LanguageSettings />

    }

  }


  // 06. SETTINGS PAGE INTERFACE

  return (

    <DashboardLayout>

      <section className="settings-page">

        {/* Page heading */}

        <div className="settings-page-heading">

          <h1>{"Settings"}</h1>

          <p>{"Manage your account, privacy and preferences."}</p>

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

            {renderSection()}

          </div>

        </div>

      </section>

    </DashboardLayout>

  )

}

export default Settings