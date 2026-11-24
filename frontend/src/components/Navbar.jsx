
import { useState } from 'react'
import {
  Bell,
  CircleHelp,
  CircleUserRound,
  ChevronDown,
  LogOut,
  Menu,
  X
} from 'lucide-react'

import '../styles/navbar.css'

function Navbar() {
  const [language, setLanguage] = useState('EN')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">

      {/* Mobile menu */}
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      {/* Navigation links */}
      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <a href="/" className="active">Home</a>
        <a href="/dashboard">Dashboard</a>
        <a href="/about">About</a>
      </nav>

      {/* Right side */}
      <div className="nav-actions">

        {/* Language selector */}
        <div className="language-selector">
          {['EN', 'CH'].map((lang) => (
            <button
              key={lang}
              className={language === lang ? 'selected' : ''}
              onClick={() => setLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <button className="icon-button" aria-label="Notifications">
          <Bell size={20} />
        </button>

        {/* Help */}
        <button className="icon-button" aria-label="Help">
          <CircleHelp size={20} />
        </button>

        {/* User profile */}
        <button className="user-profile">
          <CircleUserRound size={32} />

          <div className="user-info">
            <span>Alex</span>
            <small>Explorer</small>
          </div>

          <ChevronDown size={14} />
        </button>

        {/* Sign out */}
        <button className="sign-out" aria-label="Sign out">
          <LogOut size={20} />
          <span>Sign out</span>
        </button>

      </div>
    </header>
  )
}

export default Navbar
