
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Welcome Section
// PURPOSE: Personalized dashboard welcome
// ==========================================

// Import navigation tools
import { Link } from 'react-router-dom'
import { useLocale } from '../../lib/locale.js'

// Import icons
import { CircleCheck, ArrowRight } from 'lucide-react'

// Import animated dashboard mascot
import dashboardMascot from '../../assets/dashboard-mascot.gif'


function WelcomeSection({ userName, isGuest, onProgress, showProgress }) {
  const { t } = useLocale()

  return (
    <section className="dashboard-welcome">

      {/* 01. WELCOME CONTENT */}

      <div className="dashboard-welcome-content">

        <h1 className="dashboard-welcome-title">
          {t(`Hello, ${userName}!`, `你好，${userName}！`)}
        </h1>

        <div className="dashboard-welcome-description">

          <p>
            {t('Your future deserves more than a guess.', '你的未来值得认真探索。')}
          </p>

          <h2>
            {t('Discover Who You Can Become.', '发现更多职业可能。')}
          </h2>

          <p className="dashboard-welcome-message">
            {t("Don't just imagine your future. Design it", '亲手规划你的未来')}
            <br />
            {' '}And <strong>{t('Make It Happen.', '付诸行动。')}</strong>
          </p>

        </div>


        {/* 02. PROGRESS BUTTON */}

        {isGuest ? (
          <Link to="/signup" className="dashboard-progress-button">
            <CircleCheck size={25} />
            <span>{t('Create an account to track progress', '创建账户以跟踪进度')}</span>
            <ArrowRight size={23} />
          </Link>
        ) : (
          <button
            type="button"
            className="dashboard-progress-button"
            onClick={onProgress}
            aria-expanded={showProgress}
          >
            <CircleCheck size={25} />
            <span>{showProgress ? t('Hide Progress', '隐藏进度') : t('Check Your Progress', '查看进度')}</span>
            <ArrowRight size={23} />
          </button>
        )}

      </div>


      {/* 03. ANIMATED DASHBOARD MASCOT */}

      <div className="dashboard-welcome-mascot">

        <img
          src={dashboardMascot}
          alt={t("AI Career animated mascot", "AI Career 动画吉祥物")}
        />

      </div>

    </section>
  )
}

export default WelcomeSection
