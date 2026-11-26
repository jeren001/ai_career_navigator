
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: HeroSection
// PURPOSE: Main introduction to the platform
// ==========================================

// Import icon and mascot component
import { Star } from 'lucide-react'
import Mascot from './Mascot'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiErrorText, useLocale } from '../lib/locale.js'
import { useSession } from '../session/session.js'



// Decorative yellow rays
function DecorativeRays() {
  return (
    <svg
      className="decorative-rays"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path d="M8 16 L12 5" />
      <path d="M18 22 L29 11" />
      <path d="M23 32 L36 28" />
    </svg>
  )
}

// Main Hero Section component
function HeroSection() {
  const { t } = useLocale()
  const { status, authenticate } = useSession()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  async function continueAsGuest() {
    if (pending || status !== 'anonymous') return
    setPending(true)
    setError(null)
    try {
      const started = await authenticate('/api/auth/guest')
      if (started) navigate('/dashboard')
    } catch (requestError) {
      setError(requestError)
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="hero-section">

      {/* Left side: introduction and slogan */}
      <div className="hero-text">

        {/* Introductory label */}
        <div className="hero-label">
          <Star size={18} fill="#ffbe00" color="#ffbe00" />
          <span>{t('Your AI Career Guide', '你的 AI 职业指南')}</span>
        </div>

        {/* Main slogan */}
        <h1 className="hero-title">
          <span>{t('Dream It.', '大胆想象。')}</span>
          <span>{t('Discover It.', '尽情探索。')}</span>
          <span className="hero-highlight">
            {t('Become It.', '成就自己。')}
          </span>
        </h1>

        {/* Platform description */}
        <p className="hero-description">
          {t("Discover what you're great at, explore exciting careers, and build a future that's totally you.",
            '发现你的优势，探索职业机会，规划属于自己的未来。')}
        </p>

        {/* Main button with yellow decorative rays */}
        <div className="hero-button-wrapper">

          {/* Navigate to the account registration page */}
        <Link to={status === 'authenticated' ? '/dashboard' : '/signup'} className="hero-button">
          {status === 'authenticated' ? t('Open Dashboard', '打开仪表板') : t('Get Started', '开始探索')}
        </Link>
          <DecorativeRays />

        </div>

        {status === 'anonymous' && (
          <button type="button" className="integration-guest" disabled={pending} onClick={continueAsGuest}>
            {pending ? t('Starting guest session…', '正在创建访客会话…') : t('Continue as guest', '以访客身份继续')}
          </button>
        )}
        {error && <p role="alert">{apiErrorText(error, t)}</p>}

      </div>

      {/* Right side: mascot illustration */}
      <div className="hero-visual">
        <Mascot />
      </div>

    </section>
  )
}

// Export the component
export default HeroSection
