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
  AtSign,
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
// Import reusable username utilities
import {
  validateUsername,
  normalizeUsername,
  generateUsername,
  generateUsernameSuggestions
} from '../utils/usernameUtils'



function SignUp() {
  // Control selected language
  const [language, setLanguage] = useState('EN')
  // Control password visibility
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  // Store form values
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  // Track manual username changes
  const [isUsernameEdited, setIsUsernameEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Temporary form feedback
  const [message, setMessage] = useState('')
  
  
  // ==========================================
// USERNAME VALIDATION
// ==========================================

const isUsernameValid = validateUsername(username)


// ==========================================
// USERNAME SUGGESTIONS
// ==========================================

const usernameSuggestions =
  generateUsernameSuggestions(fullName, username)


// ==========================================
// USERNAME EVENT HANDLERS
// ==========================================

// Generate username when full name changes
function handleFullNameChange(event) {

  const name = event.target.value

  setFullName(name)

  if (!isUsernameEdited) {
    setUsername(generateUsername(name))
  }

}

// Handle manual username changes
function handleUsernameChange(event) {

  setIsUsernameEdited(true)
  setUsername(normalizeUsername(event.target.value))

}

// Handle username suggestion selection
function handleSelectUsername(suggestion) {

  setIsUsernameEdited(true)
  setUsername(normalizeUsername(suggestion))
  setMessage('')

}



  // ==========================================
  // EMAIL VALIDATION
  // ==========================================
  const isEmailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
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
  // ==========================================
  // FORM VALIDATION
  // ==========================================
    const isFormValid =
    fullName.trim().length > 0 &&
    isUsernameValid &&
    isEmailValid &&
    isPasswordValid
  // ==========================================
  // FORM SUBMISSION
  // ==========================================
  function handleSubmit(event) {
    event.preventDefault()
    // Validate username
    if (!isUsernameValid) {
      setMessage('Please enter a valid username.')
      return
    }
    // Validate email address
    if (!isEmailValid) {
      setMessage('Please enter a valid email address.')
      return
    }
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
                onChange={handleFullNameChange}
                required
              />
            </div>
            {/* Username */}
            <div className="signin-input">
              <AtSign size={18} />
              <input
                type="text"
                placeholder="Username"
                aria-label="Username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={handleUsernameChange}
                aria-invalid={
                  username.length > 0 && !isUsernameValid
                }
                aria-describedby={
                  username.length > 0
                    ? 'username-validation'
                    : undefined
                }
                minLength={3}
                maxLength={20}
                required
              />
            </div>
            {/* Dynamic username validation */}
            {username.length > 0 && (
              <div
                id="username-validation"
                className={`password-match ${
                  isUsernameValid ? 'valid' : 'invalid'
                }`}
                role="status"
              >
                {isUsernameValid
                  ? <CheckCircle2 size={15} />
                  : <XCircle size={15} />
                }
                <span>
                  {isUsernameValid
                    ? 'Valid username format'
                    : 'Use 3–20 letters, numbers, underscores or dots.'
                  }
                </span>
              </div>
            )}
            {/* Smart username suggestions */}
            {isUsernameValid &&
              usernameSuggestions.length > 0 && (
              <div className="username-suggestions">
                <p className="username-suggestions-title">
                  Suggested usernames
                </p>
                <div className="username-suggestions-list">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="username-suggestion"
                      onClick={() =>
                        handleSelectUsername(suggestion)
                      }
                    >
                      @{suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                aria-invalid={
                  email.length > 0 && !isEmailValid
                }
                aria-describedby={
                  email.length > 0
                    ? 'email-validation'
                    : undefined
                }
                required
              />
            </div>
            {/* Dynamic email validation */}
            {email.length > 0 && (
              <div
                id="email-validation"
                className={`password-match ${
                  isEmailValid ? 'valid' : 'invalid'
                }`}
                role="status"
              >
                {isEmailValid
                  ? <CheckCircle2 size={15} />
                  : <XCircle size={15} />
                }
                <span>
                  {isEmailValid
                    ? 'Valid email format'
                    : 'Please enter a valid email address.'
                  }
                </span>
              </div>
            )}
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
