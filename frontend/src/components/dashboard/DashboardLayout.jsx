
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Layout
// PURPOSE: Responsive dashboard structure
// ==========================================

// Import React tools
import { useState } from 'react'

// Import reusable components
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'

// Import dashboard styles
import '../../styles/dashboard.css'

function DashboardLayout({ children }) {

  // 01. MOBILE SIDEBAR STATE

  const [sidebarOpen, setSidebarOpen] = useState(false)


  // 02. SHARED LANGUAGE STATE

  const [language, setLanguage] = useState('EN')


  // 03. SIDEBAR CONTROLS

  function openSidebar() {
    setSidebarOpen(true)
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }


  // 04. DASHBOARD STRUCTURE

  return (
    <div className="dashboard-layout">

      {/* Mobile background overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          onClick={closeSidebar}
          aria-label="Close navigation menu"
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
        language={language}
        setLanguage={setLanguage}
      />

      {/* Dashboard workspace */}
      <div className="dashboard-workspace">

        {/* Shared dashboard header */}
        <DashboardHeader
          onMenuClick={openSidebar}
          language={language}
          setLanguage={setLanguage}
        />

        {/* Main page content */}
        <main className="dashboard-main">

          {children}

        </main>

      </div>

    </div>
  )
}

export default DashboardLayout
