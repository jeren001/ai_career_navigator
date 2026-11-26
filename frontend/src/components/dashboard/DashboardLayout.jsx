// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Layout
// PURPOSE: Responsive dashboard structure
// ==========================================

// Import React tools
import { useState } from 'react'

// Import translation tools

// Import reusable components
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'

// Import dashboard styles
import '../../styles/dashboard.css'


function DashboardLayout({ children }) {

  // 01. TRANSLATION TOOLS

  


  // 02. MOBILE SIDEBAR STATE

  const [sidebarOpen, setSidebarOpen] = useState(false)


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
          aria-label={"Close navigation menu"}
        />

      )}


      {/* Sidebar navigation */}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={closeSidebar}
      />


      {/* Dashboard workspace */}

      <div className="dashboard-workspace">

        {/* Shared dashboard header */}

        <DashboardHeader
          onMenuClick={openSidebar}
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