import { useSession } from '../../session/session.js'
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Sidebar
// PURPOSE: Dashboard navigation
// ==========================================

// Import navigation tools
import { Link, NavLink } from 'react-router-dom'
import { useLocale } from '../../lib/locale.js'
// Import sidebar styles
import '../../styles/sidebar.css'
// Import navigation icons
import {
  LayoutDashboard,
  ShieldCheck,
  GraduationCap,
  TrendingUp,
  Route,
  BookOpen,
  BriefcaseBusiness,
  ClipboardList,
  FileText,
  Bot,
  UserRound,
  CircleHelp,
  Settings,
  X,
  Globe
} from 'lucide-react'

// Import brand logo
import mascotImage from '../../assets/mascot.png'

// ==========================================
// 01. MAIN NAVIGATION
// ==========================================

const mainMenu = [
  {
    label: 'Dashboard',
    labelZh: '仪表板',
    path: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Career Test',
    labelZh: '职业测评',
    path: '/career-test',
    icon: ShieldCheck
  },
  {
    label: 'My Skills',
    labelZh: '我的技能',
    path: '/my-skills',
    icon: GraduationCap
  },
  {
    label: 'AI Career Match',
    labelZh: 'AI 职业匹配',
    path: '/career-match',
    icon: TrendingUp
  },
  {
    label: 'My Roadmap',
    labelZh: '我的路线图',
    path: '/roadmap',
    icon: Route
  },
  {
    label: 'Learning Hub',
    labelZh: '学习中心',
    path: '/learning-hub',
    icon: BookOpen
  },
  {
    label: 'Job and Internship Finder',
    labelZh: '工作与实习搜索',
    path: '/job-finder',
    icon: BriefcaseBusiness
  },
  {
    label: 'Interview Simulator',
    labelZh: '模拟面试',
    path: '/interview-simulator',
    icon: ClipboardList
  },
  {
    label: 'My Resume',
    labelZh: '我的简历',
    path: '/resume',
    icon: FileText
  },
  {
    label: 'AI Assistant',
    labelZh: 'AI 助手',
    path: '/ai-assistant',
    icon: Bot
  }
]

// ==========================================
// 02. ACCOUNT NAVIGATION
// ==========================================

const availableRoutes = new Set(['/dashboard', '/profile', '/settings', '/ai-assistant'])

const accountMenu = [
  {
    label: 'My Profile',
    labelZh: '我的资料',
    path: '/profile',
    icon: UserRound
  },
  {
    label: 'Support',
    labelZh: '帮助',
    path: '/support',
    icon: CircleHelp
  },
  {
    label: 'Settings',
    labelZh: '设置',
    path: '/settings',
    icon: Settings
  }
]

// ==========================================
// 03. REUSABLE MENU ITEM
// ==========================================

function SidebarItem({ item, onClose }) {

  const Icon = item.icon
  const { user } = useSession()
  const { t } = useLocale()
  const content = <><Icon size={21} strokeWidth={2} /><span>{t(item.label, item.labelZh)}</span></>

  if (!availableRoutes.has(item.path) || (item.path === '/ai-assistant' && user.is_guest)) {
    return (
      <span className="sidebar-link" aria-disabled="true" title={t('Screen unavailable', '此页面暂不可用')}>
        {content}
      </span>
    )
  }

  return (
    <NavLink to={item.path} onClick={onClose}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
      {content}
    </NavLink>
  )

}

// ==========================================
// 04. SIDEBAR COMPONENT
// ==========================================

function Sidebar({ isOpen, onClose }) {
  const { language, setLanguage, t } = useLocale()

  return (
    <aside className={`dashboard-sidebar ${isOpen ? 'sidebar-open' : ''}`}>

      {/* Brand logo */}
      <div className="sidebar-header">

        <Link to="/" className="sidebar-brand" onClick={onClose}>
          <img src={mascotImage} alt="" />
          <span>AI CAREER</span>
        </Link>

        {/* Mobile close button */}
        <button
        type="button"
        className="sidebar-close-button"
        onClick={onClose}
        aria-label={t('Close navigation menu', '关闭导航菜单')}
        >
        <X size={24} />
        </button>

      </div>

      {/* Navigation menu */}
      <nav
        className="sidebar-navigation"
        aria-label={t('Dashboard navigation', '仪表板导航')}
      >

        {/* Main menu */}
        <div className="sidebar-menu">

          {mainMenu.map((item) => (
            <SidebarItem
              key={item.path}
              item={item}
              onClose={onClose}
            />
          ))}

        </div>

        {/* Menu divider */}
        <div className="sidebar-divider" />

        {/* Account menu */}
        <div className="sidebar-menu">

          {accountMenu.map((item) => (
            <SidebarItem
              key={item.path}
              item={item}
              onClose={onClose}
            />
          ))}

        </div>

        {/* Mobile language selector */}
        <div className="sidebar-language">

          <div className="sidebar-language-label">
            <Globe size={20} />
            <span>{t('Language', '语言')}</span>
          </div>

          <div className="sidebar-language-options">
            {['EN', 'CH'].map((option) => (
              <button
                key={option}
                type="button"
                className={language === option ? 'active' : ''}
                aria-pressed={language === option}
                onClick={() => setLanguage(option)}
              >
                {option}
              </button>
            ))}
          </div>

        </div>

      </nav>

    </aside>
  )
}

export default Sidebar
