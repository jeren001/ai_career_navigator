
// ==========================================
// PROJECT: AI CAREER
// PAGE: Dashboard
// PURPOSE: Main user dashboard
// ==========================================

// Import dashboard components
import DashboardLayout from '../components/dashboard/DashboardLayout'
import DashboardBackground from '../components/dashboard/DashboardBackground'
import WelcomeSection from '../components/dashboard/WelcomeSection'

// Import dashboard content styles
import '../styles/dashboard-content.css'


function Dashboard() {

  return (
    <DashboardLayout>

      <div className="dashboard-hero">

        {/* 01. Decorative background */}
        <DashboardBackground />

        {/* 02. Personalized welcome section */}
        <WelcomeSection userName="Alex" />

      </div>

    </DashboardLayout>
  )
}

export default Dashboard
