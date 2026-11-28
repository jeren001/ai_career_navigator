// ==========================================
// PROJECT: AI CAREER
// PAGE: Dashboard
// PURPOSE: Main user dashboard
// ==========================================

// Import dashboard components
import { useState } from 'react'
import { useSession } from '../session/session.js'
import DashboardSummary from '../components/dashboard/DashboardSummary'
import ChallengeProgress from '../components/dashboard/ChallengeProgress'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import DashboardBackground from '../components/dashboard/DashboardBackground'
import WelcomeSection from '../components/dashboard/WelcomeSection'

// Import dashboard content styles
import '../styles/dashboard-content.css'


function Dashboard() {
  const { user } = useSession()
  const [showProgress, setShowProgress] = useState(false)

  return (
    <DashboardLayout>

      <div className="dashboard-hero">

        {/* 01. Decorative background */}
        <DashboardBackground />

        {/* 02. Personalized welcome section */}
        <WelcomeSection
          isGuest={user.is_guest}
          onProgress={() => setShowProgress((visible) => !visible)}
          showProgress={showProgress}
        />

      </div>

      {showProgress && !user.is_guest && (
        <>
          <DashboardSummary />
          <ChallengeProgress />
        </>
      )}
    </DashboardLayout>
  )
}

export default Dashboard
