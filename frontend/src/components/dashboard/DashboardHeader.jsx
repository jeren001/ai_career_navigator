
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Header
// PURPOSE: Search, language and user account
// ==========================================

// Import React tools
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import '../../styles/dashboard-header.css'

// Import icons
import {
  Bell,
  UserRound,
  ChevronDown,
  Settings,
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


  // 02. SIGN OUT

  function handleSignOut() {

    // TODO: Connect to backend authentication

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
        aria-label="Open navigation menu"
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
            aria-label="Notifications"
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

              <h3>Notifications</h3>
              <p>No new notifications.</p>

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
              <span className="profile-name">Alex</span>
              <span className="profile-role">Explorer</span>
            </div>

            <ChevronDown size={16} />

          </button>


          {/* Profile dropdown menu */}
          {profileOpen && (
            <div className="profile-dropdown">

              <h3>My Account</h3>

              <div className="profile-divider" />

              <Link
                to="/profile"
                onClick={() => setProfileOpen(false)}
              >
                <UserRound size={18} />
                My Profile
              </Link>

              <Link
                to="/settings"
                onClick={() => setProfileOpen(false)}
              >
                <Settings size={18} />
                Settings
              </Link>

              <div className="profile-divider" />

              <button
                type="button"
                className="signout-button"
                onClick={handleSignOut}
              >
                <LogOut size={18} />
                Sign Out
              </button>

            </div>
          )}

        </div>

      </div>

    </header>
  )
}

export default DashboardHeader
