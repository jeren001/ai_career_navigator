import { useLocale } from '../../lib/locale.js'

// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Assistant Welcome
// PURPOSE: AI assistant welcome screen
// ==========================================

// Import assistant mascot
import mascot from '../../assets/mascot.png'

function AssistantWelcome() {
  const { t } = useLocale()
  return (
    <section className="assistant-welcome">

      {/* 01. MASCOT */}

      <div className="assistant-mascot-container">
        <img
          src={mascot}
          alt={t('AI Career Assistant mascot', 'AI 职业助手吉祥物')}
          className="assistant-mascot"
        />
      </div>

      {/* 02. WELCOME TITLE */}

      <h2 className="assistant-welcome-title">
        {t('Explore your next career step', '探索你的职业下一步')}
      </h2>

      {/* 03. WELCOME DESCRIPTION */}

      <p className="assistant-welcome-description">
        {t('Get guidance, build new skills and make confident career decisions.', '获取职业建议，培养新技能，做出更有把握的职业选择。')}
      </p>

    </section>
  )
}

export default AssistantWelcome
