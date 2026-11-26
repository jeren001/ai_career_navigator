// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Sidebar
// PURPOSE: Responsive dashboard navigation
// ==========================================

// Import navigation tools
import { Link, NavLink } from 'react-router-dom'

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
  Globe,
  X
} from 'lucide-react'

// Import brand logo
import mascotImage from '../../assets/mascot.png'


// ==========================================
// 01. MAIN NAVIGATION
// ==========================================

const mainMenu = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard
  },
  {
    label: 'Career Test',
    path: '/career-test',
    icon: ShieldCheck
  },
  {
    label: 'My Skills',
    path: '/my-skills',
    icon: GraduationCap
  },
  {
    label: 'AI Career Match',
    path: '/career-match',
    icon: TrendingUp
  },
  {
    label: 'My Roadmap',
    path: '/roadmap',
    icon: Route
  },
  {
    label: 'Learning Hub',
    path: '/learning-hub',
    icon: BookOpen
  },
  {
    label: 'Job and Internship Finder',
    path: '/job-finder',
    icon: BriefcaseBusiness
  },
  {
    label: 'Interview Simulator',
    path: '/interview-simulator',
    icon: ClipboardList
  },
  {
    label: 'My Resume',
    path: '/resume',
    icon: FileText
  },
  {
    label: 'AI Assistant',
    path: '/ai-assistant',
    icon: Bot
  }
]


// ==========================================
// 02. ACCOUNT NAVIGATION
// ==========================================

const accountMenu = [
  {
    label: 'My Profile',
    path: '/profile',
    icon: UserRound
  },
  {
    label: 'Support',
    path: '/support',
    icon: CircleHelp
  },
  {
    label: 'Settings',
    path: '/settings',
    icon: Settings
  }
]


// ==========================================
// 03. REUSABLE MENU ITEM
// ==========================================

function SidebarItem({ item, onClose }) {

  const Icon = item.icon

  return (

    <NavLink
      to={item.path}
      onClick={onClose}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''}`
      }
    >

      <Icon size={21} strokeWidth={2} />

      <span>{item.label}</span>

    </NavLink>

  )

}


// ==========================================
// 04. SIDEBAR COMPONENT
// ==========================================

function Sidebar({ isOpen, onClose }) {

  // Default display language

  const currentLanguage = 'EN'

  const languages = ['EN', 'CH']


  return (

    <aside
      className={`dashboard-sidebar ${
        isOpen ? 'sidebar-open' : ''
      }`}
    >

      {/* Brand logo */}

      <div className="sidebar-header">

        <Link
          to="/"
          className="sidebar-brand"
          onClick={onClose}
        >

          <img src={mascotImage} alt="" />

          <span>AI CAREER</span>

        </Link>


        {/* Mobile close button */}

        <button
          type="button"
          className="sidebar-close-button"
          onClick={onClose}
          aria-label="Close navigation menu"
        >

          <X size={24} />

        </button>

      </div>


      {/* Navigation menu */}

      <nav
        className="sidebar-navigation"
        aria-label="Dashboard navigation"
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

            <span>Language</span>

          </div>


          <div className="sidebar-language-options">

            {languages.map(language => (

              <button
                key={language}
                type="button"
                className={`sidebar-language-optionsbutton ${
                  currentLanguage === language ? 'active' : ''
                }`}
                aria-pressed={currentLanguage === language}
                disabled={language !== currentLanguage}
                title={
                  language === 'CH'
                    ? 'Chinese will be available soon'
                    : 'English'
                }
              >

                {language}

              </button>

            ))}

          </div>

        </div>

      </nav>

    </aside>

  )

}

export default Sidebar