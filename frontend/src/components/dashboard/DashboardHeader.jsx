import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, LogOut, Menu, Settings, UserRound } from 'lucide-react'
import { useUser } from '../../context/user.js'
import { useLocale } from '../../lib/locale.js'
import { accountName, useSession } from '../../session/session.js'
import CommandBar from '../CommandBar'
import '../../styles/dashboard-header.css'

function DashboardHeader({ onMenuClick }) {
  const { profile } = useUser()
  const { user, signOut } = useSession()
  const { language, setLanguage, t } = useLocale()
  const navigate = useNavigate()
  const [openMenu, setOpenMenu] = useState(null)
  const profileRef = useRef(null)
  const notificationsRef = useRef(null)

  useEffect(() => {
    if (!openMenu) return

    const menu = openMenu === 'profile' ? profileRef.current : notificationsRef.current
    function handleClickOutside(event) {
      if (!menu.contains(event.target)) setOpenMenu(null)
    }
    function handleEscape(event) {
      if (event.key === 'Escape') setOpenMenu(null)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [openMenu])

  function handleSignOut() {
    signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <header className="dashboard-header">
      <div className="mobile-navigation">
        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => {
            setOpenMenu(null)
            onMenuClick()
          }}
          aria-label={t('Open navigation menu', '打开导航菜单')}
        >
          <Menu size={26} />
        </button>
        <Link to="/" className="mobile-brand">AI CAREER</Link>
      </div>

      <div className="dashboard-search">
        <CommandBar />
      </div>

      <div className="dashboard-header-actions">
        <div className="dashboard-language" role="group" aria-label={t('Display language', '显示语言')}>
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

        <div className="dashboard-notifications" ref={notificationsRef}>
          <button
            type="button"
            className="notification-button"
            aria-label={t('Notifications', '通知')}
            aria-expanded={openMenu === 'notifications'}
            onClick={() => setOpenMenu(openMenu === 'notifications' ? null : 'notifications')}
          >
            <Bell size={23} />
          </button>
          {openMenu === 'notifications' && (
            <div className="notification-dropdown">
              <h3>{t('Notifications', '通知')}</h3>
              <p>{t('Notifications are unavailable.', '暂不支持通知。')}</p>
            </div>
          )}
        </div>

        <div className="dashboard-profile" ref={profileRef}>
          <button
            type="button"
            className="profile-button"
            aria-label={t('My Account', '我的账户')}
            aria-expanded={openMenu === 'profile'}
            onClick={() => setOpenMenu(openMenu === 'profile' ? null : 'profile')}
          >
            <div className="profile-avatar">
              {profile.profilePhoto ? <img src={profile.profilePhoto} alt="" /> : <UserRound size={22} />}
            </div>
            <div className="profile-information">
              <span className="profile-name">
                {user.is_guest ? accountName(user, t) : profile.firstName || accountName(user, t)}
              </span>
              <span className="profile-role">
                {user.is_guest ? t('Guest session', '访客会话') : profile.currentStatus || t('Account', '账户')}
              </span>
            </div>
            <ChevronDown size={16} />
          </button>

          {openMenu === 'profile' && (
            <div className="profile-dropdown">
              <h3>{t('My Account', '我的账户')}</h3>
              <div className="profile-divider" />
              {user.is_guest ? (
                <Link to="/signup" onClick={() => setOpenMenu(null)}>
                  <UserRound size={18} />
                  {t('Create an Account', '创建账户')}
                </Link>
              ) : (
                <>
                  <Link to="/profile" onClick={() => setOpenMenu(null)}>
                    <UserRound size={18} />
                    {t('My Profile', '我的资料')}
                  </Link>
                  <Link to="/settings" onClick={() => setOpenMenu(null)}>
                    <Settings size={18} />
                    {t('Settings', '设置')}
                  </Link>
                </>
              )}
              <div className="profile-divider" />
              <button type="button" className="signout-button" onClick={handleSignOut}>
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
