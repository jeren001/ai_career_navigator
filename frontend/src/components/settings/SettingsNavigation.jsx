// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Settings Navigation
// PURPOSE: Manage settings section navigation
// ==========================================

// Import icons
import {
  UserRound,
  ShieldCheck,
  Bell,
  Globe,
  Trash2
} from 'lucide-react'


// ==========================================
// 01. SETTINGS NAVIGATION ITEMS
// ==========================================

const settingsItems = [

  {
    id: 'account',
    label: 'Account',
    icon: UserRound
  },

  {
    id: 'privacy',
    label: 'Privacy & Visibility',
    icon: ShieldCheck
  },

  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell
  },

  {
    id: 'language',
    label: 'Language',
    icon: Globe
  },

  {
    id: 'delete-account',
    label: 'Delete Account',
    icon: Trash2
  }

]


// ==========================================
// 02. SETTINGS NAVIGATION COMPONENT
// ==========================================

function SettingsNavigation({
  activeSection,
  onSectionChange
}) {

  // 03. NAVIGATION INTERFACE

  return (

    <nav
      className="settings-navigation"
      aria-label="Settings navigation"
    >

      {settingsItems.map(item => {

        const Icon = item.icon

        return (

          <button
            key={item.id}
            type="button"
            className={`
              settings-nav-button
              ${activeSection === item.id ? 'active' : ''}
              ${item.id === 'delete-account' ? 'danger' : ''}
            `}
            aria-current={
              activeSection === item.id ? 'true' : undefined
            }
            onClick={() => onSectionChange(item.id)}
          >

            <Icon size={20} />

            <span>{item.label}</span>

          </button>

        )

      })}

    </nav>

  )

}

export default SettingsNavigation