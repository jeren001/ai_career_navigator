// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Navbar
// PURPOSE: Main navigation bar
// ==========================================

// Import React and navigation tools
import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useLocale } from '../lib/locale.js'
import { useSession } from '../session/session.js'

// Import navigation styles
import '../styles/navbar.css'

function Navbar() {

  // Language and mobile menu states
  const { language, setLanguage, t } = useLocale()
  const { status, user } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">

      {/* 01. Mobile menu */}
      <button
        className="mobile-menu"
        aria-label={t('Toggle navigation', '切换导航')}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      {/* 02. Navigation links */}
      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>

        <NavLink to="/" end>
          {t('Home', '首页')}
        </NavLink>

        <NavLink to="/dashboard">
          {t('Dashboard', '仪表板')}
        </NavLink>

        <NavLink to="/about">
          {t('About', '关于')}
        </NavLink>

      </nav>

      {/* 03. Right side actions */}
      <div className="nav-actions">

        {/* Language selector */}
        <div className="language-selector">
          {['EN', 'CH'].map((lang) => (
            <button
              key={lang}
              className={language === lang ? 'selected' : ''}
              aria-pressed={language === lang}
              onClick={() => setLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Sign In link */}
        <Link to={status === 'authenticated' && !user.is_guest ? '/dashboard' : '/signin'} className="nav-signin">
          {status === 'authenticated' && !user.is_guest ? t('My Account', '我的账户') : t('Sign In', '登录')}
        </Link>

      

      </div>

    </header>
  )
}




// Export the navigation component
export default Navbar