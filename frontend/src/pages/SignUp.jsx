// ==========================================
// PROJECT: AI CAREER
// PAGE: Sign Up
// PURPOSE: User registration interface
// ==========================================
// Import React and navigation tools
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { apiErrorText, useLocale } from '../lib/locale.js'
import { storeProfileUsername } from '../lib/storage.js'
import { useSession } from '../session/session.js'
// Import reusable username utilities
import {
  validateUsername,
  normalizeUsername,
  generateUsername,
  generateUsernameSuggestions
} from '../utils/usernameUtils'



function SignUp() {
  const { language, setLanguage, t } = useLocale()
  const { authenticate, status, user } = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [isUsernameEdited, setIsUsernameEdited] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')

  const isUsernameValid = validateUsername(username)
  const usernameSuggestions = generateUsernameSuggestions(fullName, username)
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  const hasValidLength = password.length >= 10 && password.length <= 128
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0
  const isFormValid = Boolean(fullName.trim() && isUsernameValid && isEmailValid && hasValidLength && passwordsMatch)
  const submitDisabled = !isFormValid || pending || status === 'loading'

  function handleFullNameChange(event) {
    const name = event.target.value
    setFullName(name)
    if (!isUsernameEdited) setUsername(generateUsername(name))
  }

  function selectUsername(value) {
    setIsUsernameEdited(true)
    setUsername(normalizeUsername(value))
    setMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitDisabled) return
    setPending(true)
    setMessage('')
    try {
      const registeredUser = await authenticate('/api/auth/register', {
        body: { display_name: fullName.trim(), email: email.trim(), password },
        upgradeGuest: user?.is_guest === true
      })
      if (registeredUser) {
        storeProfileUsername(registeredUser.id, username)
        navigate('/dashboard', { replace: true })
      }
    } catch (error) {
      setMessage(apiErrorText(error, t, 'register'))
    } finally {
      setPending(false)
    }
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
              aria-pressed={language === lang}
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
              {t('Create an Account', '创建账户')}
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
            <p>{t("Let's start your career journey! ✨", '开启你的职业探索之旅！✨')}</p>
          </div>
          {/* 03. REGISTRATION FORM */}
          <form
            className="signin-form signup-form"
            onSubmit={handleSubmit}
            aria-busy={pending}
            onChange={() => setMessage('')}
          >
            {/* Full name */}
            <div className="signin-input">
              <UserRound size={18} />
              <input
                type="text"
                placeholder={t('Full Name', '姓名')}
                aria-label={t('Full name', '姓名')}
                autoComplete="name"
                maxLength={120}
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
                placeholder={t('Username', '用户名')}
                aria-label={t('Username', '用户名')}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                value={username}
                onChange={(event) => selectUsername(event.target.value)}
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
                    ? t('Valid username format', '用户名格式有效')
                    : t('Use 3–20 letters, numbers, underscores or dots.', '请输入 3 至 20 个英文字母、数字、下划线或句点。')
                  }
                </span>
              </div>
            )}
            {/* Smart username suggestions */}
            {isUsernameValid &&
              usernameSuggestions.length > 0 && (
              <div className="username-suggestions">
                <p className="username-suggestions-title">
                  {t('Suggested usernames', '建议的用户名')}
                </p>
                <div className="username-suggestions-list">
                  {usernameSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      className="username-suggestion"
                      onClick={() =>
                        selectUsername(suggestion)
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
                placeholder={t('Email', '邮箱')}
                aria-label={t('Email', '邮箱')}
                autoComplete="email"
                maxLength={254}
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
                    ? t('Valid email format', '邮箱格式有效')
                    : t('Please enter a valid email address.', '请输入有效的邮箱地址。')
                  }
                </span>
              </div>
            )}
            {/* Password */}
            <div className="signin-input">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={t('Password', '密码')}
                aria-label={t('Password', '密码')}
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={
                  password.length > 0
                    ? 'password-requirements'
                    : undefined
                }
                minLength={10}
                maxLength={128}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? t('Hide password', '隐藏密码') : t('Show password', '显示密码')}
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
                  {t('Password requirements', '密码要求')}
                </p>
                <div className={`password-rule ${hasValidLength ? 'valid' : ''}`}>
                  {hasValidLength ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  <span>{t('10–128 characters', '10 至 128 个字符')}</span>
                </div>
              </div>
            )}
            {/* Confirm password */}
            <div className="signin-input">
              <LockKeyhole size={18} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={t('Confirm Password', '确认密码')}
                aria-label={t('Confirm password', '确认密码')}
                autoComplete="new-password"
                value={confirmPassword}
                maxLength={128}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={
                  confirmPassword.length > 0 && !passwordsMatch
                }
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirmPassword ? t('Hide password', '隐藏密码') : t('Show password', '显示密码')}
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
                    ? t('Passwords match', '两次密码一致')
                    : t('Passwords do not match', '两次密码不一致')
                  }
                </span>
              </div>
            )}
            {/* Create account button */}
            <button
              type="submit"
              className="signin-submit"
              disabled={submitDisabled}
            >
              {pending ? t('Creating account…', '正在创建账户…') : t('Create an Account', '创建账户')}
              <ArrowRight size={18} />
            </button>
          </form>
          {/* 04. SOCIAL AUTHENTICATION */}
          <div className="signin-divider">
            <span>{t('or continue with', '或使用以下方式继续')}</span>
          </div>
          <div className="social-buttons">
            {/* Google authentication */}
            <button
              type="button"
              onClick={() => setMessage(t('Google registration coming soon.', '暂不支持通过 Google 注册。'))}
            >
              <FcGoogle size={22} />
              Google
            </button>
            {/* Apple authentication */}
            <button
              type="button"
              onClick={() => setMessage(t('Apple registration coming soon.', '暂不支持通过 Apple 注册。'))}
            >
              <FaApple size={22} />
              Apple
            </button>
          </div>
          {/* Temporary feedback */}
          {message && (
            <p className="signin-message" role="alert">
              {message}
            </p>
          )}
          {/* 05. EXISTING ACCOUNT */}
          <div className="signin-register">
            {t('Already have an account?', '已有账户？')}{' '}
            <Link to="/signin">{t('Sign In', '登录')}</Link>
          </div>
        </section>
      </main>
      {/* 06. DECORATIVE WAVES */}
      <WaveBackground />
    </div>
  )
}
export default SignUp
