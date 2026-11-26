
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Welcome Section
// PURPOSE: Personalized dashboard welcome
// ==========================================

// Import navigation tools
import { Link } from 'react-router-dom'

// Import global user context
import { useUser } from '../../context/UserContext'


// Import icons
import { CircleCheck, ArrowRight } from 'lucide-react'

// Import animated dashboard mascot
import dashboardMascot from '../../assets/dashboard-mascot.gif'


function WelcomeSection() {

  // Access global user data
  const { profile } = useUser()

  // Get the user's first name
  const userName = profile.firstName || 'Explorer'

  return (
    <section className="dashboard-welcome">

      {/* 01. WELCOME CONTENT */}

      <div className="dashboard-welcome-content">

        <h1 className="dashboard-welcome-title">
          Hello, {userName}!
        </h1>

        <div className="dashboard-welcome-description">

          <p>
            Your future deserves more than a guess.
          </p>

          <h2>
            Discover Who You Can Become.
          </h2>

          <p className="dashboard-welcome-message">
            Don't just imagine your future. Design it
            <br />
            {' '}And <strong>Make It Happen.</strong>
          </p>

        </div>


        {/* 02. PROGRESS BUTTON */}

        <Link
          to="/progress"
          className="dashboard-progress-button"
        >

          <CircleCheck size={25} />

          <span>Check Your Progress</span>

          <ArrowRight size={23} />

        </Link>

      </div>


      {/* 03. ANIMATED DASHBOARD MASCOT */}

      <div className="dashboard-welcome-mascot">

        <img
          src={dashboardMascot}
          alt="AI Career animated mascot"
        />

      </div>

    </section>
  )
}

export default WelcomeSection
