
// ==========================================
// PROJECT: AI CAREER
// PAGE: Sign Up
// PURPOSE: User registration interface
// ==========================================

// Import React and navigation tools
import { useState } from 'react'
import { Link } from 'react-router-dom'

// Import social authentication icons
import { FcGoogle } from 'react-icons/fc'
import { FaApple } from 'react-icons/fa'

// Import interface icons
import {
  UserRound,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  Circle,
  XCircle
} from 'lucide-react'

// Import reusable components and assets
import Mascot from '../components/Mascot'
import WaveBackground from '../components/WaveBackground'
import mascotImage from '../assets/mascot.png'

// Import styles
import '../styles/signin.css'
import '../styles/signup.css'

function SignUp() {

  // Control selected language
  const [language, setLanguage] = useState('EN')

  // Control password visibility
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Store form values
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Temporary form feedback
  const [message, setMessage] = useState('')

  // ==========================================
  // PASSWORD VALIDATION
  // ==========================================

  // Check minimum password length
  const hasMinLength = password.length >= 8

  // Check if password contains a number
  const hasNumber = /[0-9]/.test(password)

  // Check if password contains an uppercase letter
  const hasUppercase = /[A-Z]/.test(password)

  // Check if both passwords match
  const passwordsMatch =
    password === confirmPassword &&
    confirmPassword.length > 0

  // Define password requirements
  const passwordRules = [
    {
      label: 'At least 8 characters',
      valid: hasMinLength
    },
    {
      label: 'At least one number',
      valid: hasNumber
    },
    {
      label: 'At least one uppercase letter',
      valid: hasUppercase
    }
  ]

  // Check if password meets all requirements
  const isPasswordValid =
    hasMinLength &&
    hasNumber &&
    hasUppercase &&
    passwordsMatch

  // Check if all required fields are completed
  const isFormValid =
    fullName.trim().length > 0 &&
    email.trim().length > 0 &&
    isPasswordValid

  // ==========================================
  // FORM SUBMISSION
  // ==========================================

  function handleSubmit(event) {
    event.preventDefault()

    // Validate password length
    if (!hasMinLength) {
      setMessage('Password must contain at least 8 characters.')
      return
    }

    // Validate number requirement
    if (!hasNumber) {
      setMessage('Password must contain at least one number.')
      return
    }

    // Validate uppercase letter requirement
    if (!hasUppercase) {
      setMessage('Password must contain at least one uppercase letter.')
      return
    }

    // Check if passwords match
    if (!passwordsMatch) {
      setMessage('Passwords do not match.')
      return
    }

    // Validate required fields
    if (!isFormValid) {
      setMessage('Please complete all required fields.')
      return
    }

    // Backend integration will be added later
    setMessage('Registration is not connected yet.')
  }

  return (
    <div className="signin-page signup-page">

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
      <main className="signin-content signup-content">

        {/* Left side - Animated mascot */}
        <div className="signin-visual">
          <Mascot />
        </div>

        {/* Right side - Registration card */}
        <section className="signin-card signup-card">

          {/* Card heading */}
          <div className="signin-heading">

            <h1 className="signin-title">
              Create an Account

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

            <p>Let's start your career journey! ✨</p>

          </div>

          {/* 03. REGISTRATION FORM */}
          <form
            className="signin-form signup-form"
            onSubmit={handleSubmit}
            onChange={() => setMessage('')}
          >

            {/* Full name */}
            <div className="signin-input">
              <UserRound size={18} />

              <input
                type="text"
                placeholder="Full Name"
                aria-label="Full name"
                autoComplete="name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>

            {/* Email address */}
            <div className="signin-input">
              <Mail size={18} />

              <input
                type="email"
                placeholder="Email"
                aria-label="Email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div className="signin-input">
              <LockKeyhole size={18} />

              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                aria-label="Password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={
                  password.length > 0
                    ? 'password-requirements'
                    : undefined
                }
                minLength={8}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

            </div>

            {/* Dynamic password requirements */}
            {password.length > 0 && (
              <div
                className="password-requirements"
                id="password-requirements"
              >

                <p className="password-requirements-title">
                  Password requirements
                </p>

                {passwordRules.map((rule) => (
                  <div
                    key={rule.label}
                    className={`password-rule ${rule.valid ? 'valid' : ''}`}
                  >

                    {rule.valid
                      ? <CheckCircle2 size={15} />
                      : <Circle size={15} />
                    }

                    <span>{rule.label}</span>

                  </div>
                ))}

              </div>
            )}

            {/* Confirm password */}
            <div className="signin-input">
              <LockKeyhole size={18} />

              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                aria-label="Confirm password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={
                  confirmPassword.length > 0 && !passwordsMatch
                }
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>

            </div>

            {/* Password confirmation feedback */}
            {confirmPassword.length > 0 && (
              <div
                className={`password-match ${
                  passwordsMatch ? 'valid' : 'invalid'
                }`}
                role="status"
              >

                {passwordsMatch
                  ? <CheckCircle2 size={15} />
                  : <XCircle size={15} />
                }

                <span>
                  {passwordsMatch
                    ? 'Passwords match'
                    : 'Passwords do not match'
                  }
                </span>

              </div>
            )}

            {/* Create account button */}
            <button
              type="submit"
              className="signin-submit"
              disabled={!isFormValid}
            >
              Create an Account
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
              onClick={() => setMessage('Google registration coming soon.')}
            >
              <FcGoogle size={22} />
              Google
            </button>

            {/* Apple authentication */}
            <button
              type="button"
              onClick={() => setMessage('Apple registration coming soon.')}
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

          {/* 05. EXISTING ACCOUNT */}
          <div className="signin-register">
            Already have an account?{' '}
            <Link to="/signin">Sign In</Link>
          </div>

        </section>

      </main>

      {/* 06. DECORATIVE WAVES */}
      <WaveBackground />

    </div>
  )
}

export default SignUp
