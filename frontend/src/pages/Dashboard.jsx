
// ==========================================
// PROJECT: AI CAREER
// PAGE: Dashboard
// PURPOSE: Main user dashboard
// ==========================================

// Import dashboard components
import { useState } from 'react'
import { accountName, useSession } from '../session/session.js'
import { useLocale } from '../lib/locale.js'
import ChallengeProgress from '../components/dashboard/ChallengeProgress'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import DashboardBackground from '../components/dashboard/DashboardBackground'
import WelcomeSection from '../components/dashboard/WelcomeSection'

// Import dashboard content styles
import '../styles/dashboard-content.css'


function Dashboard() {
  const { user } = useSession()
  const { t } = useLocale()
  const [showProgress, setShowProgress] = useState(false)

  return (
    <DashboardLayout>

      <div className="dashboard-hero">

        {/* 01. Decorative background */}
        <DashboardBackground />

        {/* 02. Personalized welcome section */}
        <WelcomeSection
          userName={accountName(user, t)}
          isGuest={user.is_guest}
          onProgress={() => setShowProgress((visible) => !visible)}
          showProgress={showProgress}
        />

      </div>

      {showProgress && !user.is_guest && <ChallengeProgress />}
    </DashboardLayout>
  )
}

export default Dashboard
