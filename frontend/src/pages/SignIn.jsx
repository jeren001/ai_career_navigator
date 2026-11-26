
// ==========================================
// PROJECT: AI CAREER
// PAGE: Sign In
// PURPOSE: User authentication interface
// ==========================================

// Import React and navigation tools
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
import { apiErrorText, useLocale } from '../lib/locale.js'
import { useSession } from '../session/session.js'

function SignIn() {

  // Control password visibility
  const [showPassword, setShowPassword] = useState(false)

  const { language, setLanguage, t } = useLocale()
  const { accountUpdated, authenticate, status } = useSession()
  const navigate = useNavigate()
  const accountNotice = {
    password: t('Password updated. Sign in with your new password.', '密码已更新。请使用新密码登录。'),
    'email-change': t('Email updated. Sign in with your new email.', '邮箱已更新。请使用新邮箱登录。'),
    deleted: t('Your account was deleted.', '你的账户已删除。')
  }[accountUpdated]
  const [pending, setPending] = useState(false)

  // Temporary form feedback
  const [message, setMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    if (pending || status === 'loading') return
    const fields = new FormData(event.currentTarget)
    setPending(true)
    setMessage('')
    try {
      const signedIn = await authenticate('/api/auth/login', {
        body: { email: fields.get('email').trim(), password: fields.get('password') },
        remember: fields.has('remember')
      })
      if (signedIn) navigate('/dashboard', { replace: true })
    } catch (error) {
      setMessage(apiErrorText(error, t, 'login'))
    } finally {
      setPending(false)
    }
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
              aria-pressed={language === lang}
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
              {t('Sign In', '登录')}

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

            <p>{t("Welcome back to AI CAREER! 👋", "欢迎回到 AI CAREER！👋")}</p>

          </div>

          {/* 03. SIGN IN FORM */}
          <form
            className="signin-form"
            onSubmit={handleSubmit}
            aria-busy={pending}
            onChange={() => setMessage('')}
          >

            {/* Email field */}
            <div className="signin-input">
              <Mail size={18} />

              <input
                type="email"
                name="email"
                placeholder={t("Email", "邮箱")}
                aria-label={t("Email", "邮箱")}
                autoComplete="email"
                required
              />
            </div>

            {/* Password field */}
            <div className="signin-input">
              <LockKeyhole size={18} />

              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder={t("Password", "密码")}
                aria-label={t("Password", "密码")}
                autoComplete="current-password"
                required
              />

              {/* Show or hide password */}
              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPassword ? t("Hide password", "隐藏密码") : t("Show password", "显示密码")
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
                <input type="checkbox" name="remember" />
                {t("Remember me", "记住我")}
              </label>

              <Link className="forgot-password" to="/password-recovery">
                {t('Forgot your password?', '忘记密码？')}
              </Link>

            </div>

            {/* Submit button */}
            <button type="submit" className="signin-submit" disabled={pending || status === 'loading'}>
              {pending ? t('Signing in…', '正在登录…') : t('Sign In', '登录')}
              <ArrowRight size={18} />
            </button>

          </form>

          {/* 04. SOCIAL AUTHENTICATION */}
          <div className="signin-divider">
            <span>{t("or continue with", "或使用以下方式继续")}</span>
          </div>

          <div className="social-buttons">

            {/* Google authentication */}
            <button
              type="button"
              onClick={() =>
                setMessage(t("Google Sign In coming soon.", "暂不支持 Google 登录。"))
              }
            >
              <FcGoogle size={22} />
              Google
            </button>

            {/* Apple authentication */}
            <button
              type="button"
              onClick={() =>
                setMessage(t("Apple Sign In coming soon.", "暂不支持 Apple 登录。"))
              }
            >
              <FaApple size={22} />
              Apple
            </button>

          </div>

          {/* Temporary feedback */}
          {accountNotice && !message && <p role="status">{accountNotice}</p>}
          {message && (
            <p className="signin-message" role="alert">
              {message}
            </p>
          )}

          {/* 05. CREATE AN ACCOUNT */}
          <div className="signin-register">
            {t("Don't have an account?", "还没有账户？")}{' '}

            <Link to="/signup">
              {t("Create an Account", "创建账户")}
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
