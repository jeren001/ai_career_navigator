
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Assistant Welcome
// PURPOSE: AI assistant welcome screen
// ==========================================

// Import assistant mascot
import mascot from '../../assets/mascot.png'

function AssistantWelcome() {
  return (
    <section className="assistant-welcome">

      {/* 01. MASCOT */}

      <div className="assistant-mascot-container">
        <img
          src={mascot}
          alt="AI Career Assistant mascot"
          className="assistant-mascot"
        />
      </div>

      {/* 02. WELCOME TITLE */}

      <h2 className="assistant-welcome-title">
        Your Future Starts <span>Here:</span>
      </h2>

      {/* 03. WELCOME DESCRIPTION */}

      <p className="assistant-welcome-description">
        Get guidance, build new skills and make
        confident career decisions.
      </p>

    </section>
  )
}

export default AssistantWelcome
