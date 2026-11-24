// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Navbar
// PURPOSE: Main navigation bar
// ==========================================

// Import React and navigation tools
import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'

// Import navigation styles
import '../styles/navbar.css'

function Navbar() {

  // Language and mobile menu states
  const [language, setLanguage] = useState('EN')
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="navbar">

      {/* 01. Mobile menu */}
      <button
        className="mobile-menu"
        aria-label="Toggle navigation"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        {menuOpen ? <X /> : <Menu />}
      </button>

      {/* 02. Navigation links */}
      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>

        <NavLink to="/" end>
          Home
        </NavLink>

        <NavLink to="/dashboard">
          Dashboard
        </NavLink>

        <NavLink to="/about">
          About
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
              onClick={() => setLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>

        {/* Sign In link */}
        <Link to="/signin" className="nav-signin">
          Sign In
        </Link>

      

      </div>

    </header>
  )
}




// Export the navigation component
export default Navbar