
// ==========================================
// PROJECT: AI CAREER
// PAGE: Sign In
// PURPOSE: User authentication interface
// ==========================================

// Import React and navigation tools
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '../context/UserContext'

// Import social authentication icons
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'

// Import interface icons
import {
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight
} from 'lucide-react'

// Import reusable components and assets
import Mascot from '../components/Mascot'
import WaveBackground from '../components/WaveBackground'
import mascotImage from '../assets/mascot.png'

// Import page styles
import '../styles/signin.css'

function SignIn() {

  const { state } = useLocation()
  const navigate = useNavigate()
  const { resetProfile } = useUser()
  const handledSignOut = useRef(false)

  useEffect(() => {
    if (state?.signOut && !handledSignOut.current) {
      handledSignOut.current = true
      // The route blocker has already permitted leaving the editor.
      resetProfile()
      navigate('/signin', { replace: true })
    }
  }, [state, resetProfile, navigate])

  // Control password visibility
  const [showPassword, setShowPassword] = useState(false)

  // Control selected language
  const [language, setLanguage] = useState('EN')

  // Temporary form feedback
  const [message, setMessage] = useState('')

  // Handle form submission
  function handleSubmit(event) {
    event.preventDefault()
    setMessage('Authentication is not connected yet.')
  }

  return (
    <div className="signin-page">

      {/* 01. HEADER */}
      <header className="signin-header">

        {/* Brand logo */}
        <Link to="/" className="signin-brand">
          <img src={mascotImage} alt="" />
          <span>AI CAREER</span>
        </Link>

        {/* Language selector */}
        <div className="language-selector">
          {['EN', 'CH'].map((lang) => (
            <button
              key={lang}
              type="button"
              className={language === lang ? 'selected' : ''}
              onClick={() => setLanguage(lang)}
            >
              {lang}
            </button>
          ))}
        </div>

      </header>

      {/* 02. MAIN CONTENT */}
      <main className="signin-content">

        {/* Left side - Animated mascot */}
        <div className="signin-visual">
          <Mascot />
        </div>

        {/* Right side - Authentication card */}
        <section className="signin-card">

          {/* Card heading */}
          <div className="signin-heading">

            <h1 className="signin-title">
              Sign In

              {/* Decorative yellow rays */}
              <svg
                className="signin-rays"
                viewBox="0 0 40 40"
                aria-hidden="true"
              >
                <path d="M8 16 L12 4" />
                <path d="M18 21 L28 9" />
                <path d="M24 30 L37 25" />
              </svg>

            </h1>

            <p>Welcome back to AI CAREER! 👋</p>

          </div>

          {/* 03. SIGN IN FORM */}
          <form
            className="signin-form"
            onSubmit={handleSubmit}
          >

            {/* Email field */}
            <div className="signin-input">
              <Mail size={18} />

              <input
                type="email"
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                required
              />
            </div>

            {/* Password field */}
            <div className="signin-input">
              <LockKeyhole size={18} />

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                aria-label="Password"
                autoComplete="current-password"
                required
              />

              {/* Show or hide password */}
              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPassword ? 'Hide password' : 'Show password'
                }
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword
                  ? <EyeOff size={18} />
                  : <Eye size={18} />
                }
              </button>

            </div>

            {/* Remember me and password recovery */}
            <div className="signin-options">

              <label className="remember-me">
                <input type="checkbox" />
                Remember me
              </label>

              <button
                type="button"
                className="forgot-password"
                onClick={() =>
                  setMessage('Password recovery coming soon.')
                }
              >
                Forgot your password?
              </button>

            </div>

            {/* Submit button */}
            <button type="submit" className="signin-submit">
              Sign In
              <ArrowRight size={18} />
            </button>

          </form>

          {/* 04. SOCIAL AUTHENTICATION */}
          <div className="signin-divider">
            <span>or continue with</span>
          </div>

          <div className="social-buttons">

            {/* Google authentication */}
            <button
              type="button"
              onClick={() =>
                setMessage('Google Sign In coming soon.')
              }
            >
              <FcGoogle size={22} />
              Google
            </button>

            {/* Apple authentication */}
            <button
              type="button"
              onClick={() =>
                setMessage('Apple Sign In coming soon.')
              }
            >
              <FaApple size={22} />
              Apple
            </button>

          </div>

          {/* Temporary feedback */}
          {message && (
            <p className="signin-message" role="status">
              {message}
            </p>
          )}

          {/* 05. CREATE AN ACCOUNT */}
          <div className="signin-register">
            Don't have an account?{' '}

            <Link to="/signup">
              Create an Account
            </Link>

          </div>

        </section>

      </main>

      {/* 06. DECORATIVE WAVES */}
      <WaveBackground />

    </div>
  )
}

// Export Sign In page
export default SignIn
