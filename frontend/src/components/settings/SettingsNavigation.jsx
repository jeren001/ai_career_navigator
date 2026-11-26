// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Settings Navigation
// PURPOSE: Manage settings section navigation
// ==========================================

import { useLocale } from '../../lib/locale.js'

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
    labelZh: '账户',
    icon: UserRound
  },

  {
    id: 'privacy',
    label: 'Privacy & Visibility',
    labelZh: '隐私与可见性',
    icon: ShieldCheck
  },

  {
    id: 'notifications',
    label: 'Notifications',
    labelZh: '通知',
    icon: Bell
  },

  {
    id: 'language',
    label: 'Language',
    labelZh: '语言',
    icon: Globe
  },

  {
    id: 'delete-account',
    label: 'Delete Account',
    labelZh: '删除账户',
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

  const { t } = useLocale()

  return (

    <nav
      className="settings-navigation"
      aria-label={t('Settings navigation', '设置导航')}
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

            <span>{t(item.label, item.labelZh)}</span>

          </button>

        )

      })}

    </nav>

  )

}

export default SettingsNavigation
