
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Header
// PURPOSE: Search, language and user account
// ==========================================

// Import React tools
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../../styles/dashboard-header.css'
import { useLocale } from '../../lib/locale.js'
import { accountName, useSession } from '../../session/session.js'

// Import icons
import {
  Bell,
  UserRound,
  ChevronDown,
  LogOut,
  Menu
} from 'lucide-react'

// Import reusable search component
import CommandBar from '../CommandBar'

function DashboardHeader({
  onMenuClick,
  language,
  setLanguage
}) {

  // 01. COMPONENT STATES

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const navigate = useNavigate()
  const { user, signOut } = useSession()
  const { t } = useLocale()


  // 02. SIGN OUT

  function handleSignOut() {

    signOut()

    setProfileOpen(false)
    navigate('/signin', { replace: true })

  }


    // 03. HEADER INTERFACE

    return (
        <header className="dashboard-header">

            {/* Mobile navigation */}
    <div className="mobile-navigation">

    <button
        type="button"
        className="mobile-menu-button"
        onClick={() => {
        setProfileOpen(false)
        setNotificationsOpen(false)
        onMenuClick()
        }}
        aria-label={t('Open navigation menu', '打开导航菜单')}
    >
        <Menu size={26} />
    </button>

    <Link to="/" className="mobile-brand">
        AI CAREER
    </Link>

    </div>

      {/* Search bar */}
      <div className="dashboard-search">
        <CommandBar />
      </div>

      <div className="dashboard-header-actions">

        {/* Language selector */}
        <div className="dashboard-language">

          <button
            type="button"
            className={language === 'EN' ? 'active' : ''}
            onClick={() => setLanguage('EN')}
          >
            EN
          </button>

          <button
            type="button"
            className={language === 'CH' ? 'active' : ''}
            onClick={() => setLanguage('CH')}
          >
            CH
          </button>

        </div>


        {/* Notifications */}
        <div className="dashboard-notifications">

          <button
            type="button"
            className="notification-button"
            aria-label={t('Notifications', '通知')}
            aria-expanded={notificationsOpen}
            onClick={() => {
              setNotificationsOpen(!notificationsOpen)
              setProfileOpen(false)
            }}
          >
            <Bell size={23} />
          </button>

          {notificationsOpen && (
            <div className="notification-dropdown">

              <h3>{t('Notifications', '通知')}</h3>
              <p>{t('Notifications are unavailable.', '暂不支持通知。')}</p>

            </div>
          )}

        </div>


        {/* User profile */}
        <div className="dashboard-profile">

          <button
            type="button"
            className="profile-button"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen(!profileOpen)
              setNotificationsOpen(false)
            }}
          >

            <div className="profile-avatar">
              <UserRound size={22} />
            </div>

            <div className="profile-information">
              <span className="profile-name">{accountName(user, t)}</span>
              <span className="profile-role">{user.is_guest ? t('Guest session', '访客会话') : t('Account', '账户')}</span>
            </div>

            <ChevronDown size={16} />

          </button>


          {/* Profile dropdown menu */}
          {profileOpen && (
            <div className="profile-dropdown">

              <h3>{t('My Account', '我的账户')}</h3>

              <div className="profile-divider" />

              {user.is_guest && (
                <Link to="/signup" onClick={() => setProfileOpen(false)}>
                  <UserRound size={18} />
                  {t('Create an Account', '创建账户')}
                </Link>
              )}

              <button
                type="button"
                className="signout-button"
                onClick={handleSignOut}
              >
                <LogOut size={18} />
                {t('Sign Out', '退出登录')}
              </button>

            </div>
          )}

        </div>

      </div>

    </header>
  )
}

export default DashboardHeader
