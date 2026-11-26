// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Header
// PURPOSE: Search, language and user account
// ==========================================

// Import React tools
import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'

// Import global user context
import { useUser } from '../../context/UserContext'

// Import styles
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


function DashboardHeader({ onMenuClick }) {

  // 01. GLOBAL USER DATA

  const { profile, resetProfile } = useUser()


  // 02. DEFAULT DISPLAY LANGUAGE

  const currentLanguage = 'EN'

  const languages = ['EN', 'CH']


  // 03. COMPONENT STATES

  const [profileOpen, setProfileOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  const navigate = useNavigate()


  // 04. DROPDOWN REFERENCES

  const profileRef = useRef(null)
  const notificationsRef = useRef(null)


  // 05. CLOSE DROPDOWNS

  useEffect(() => {

    function handleClickOutside(event) {

      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false)
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false)
      }

    }

    function handleEscape(event) {

      if (event.key === 'Escape') {
        setProfileOpen(false)
        setNotificationsOpen(false)
      }

    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {

      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)

    }

  }, [])


  // 06. SIGN OUT

  function handleSignOut() {

    // TODO: Connect to backend authentication

    resetProfile()

    setProfileOpen(false)
    setNotificationsOpen(false)

    navigate('/signin', { replace: true })

  }


  // 07. HEADER INTERFACE

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

        <div
          className="dashboard-language"
          aria-label="Display language"
        >

          {languages.map(language => (

            <button
              key={language}
              type="button"
              className={`dashboard-languagebutton ${
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


        {/* Notifications */}

        <div
          className="dashboard-notifications"
          ref={notificationsRef}
        >

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

        <div
          className="dashboard-profile"
          ref={profileRef}
        >

          <button
            type="button"
            className="profile-button"
            aria-label="My Account"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen(!profileOpen)
              setNotificationsOpen(false)
            }}
          >

            {/* Dynamic profile photo */}

            <div className="profile-avatar">

              {profile.profilePhoto ? (

                <img
                  src={profile.profilePhoto}
                  alt="Profile Photo"
                />

              ) : (

                <UserRound size={22} />

              )}

            </div>


            {/* Dynamic user information */}

            <div className="profile-information">

              <span className="profile-name">

                {profile.firstName || 'User'}

              </span>

              <span className="profile-role">

                {profile.currentStatus || 'Explorer'}

              </span>

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