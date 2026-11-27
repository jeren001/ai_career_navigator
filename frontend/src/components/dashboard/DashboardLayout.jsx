// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Layout
// PURPOSE: Responsive dashboard structure
// ==========================================

// Import React tools
import { useEffect, useId, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

// Import translation tools

// Import reusable components
import Sidebar from './Sidebar'
import DashboardHeader from './DashboardHeader'

// Import dashboard styles
import '../../styles/dashboard.css'


function DashboardLayout({ children, overlayHeader: OverlayHeader }) {
  const sidebarDialog = useRef(null)
  const sidebarDialogId = useId()
  const location = useLocation()

  useEffect(() => {
    const dialog = sidebarDialog.current
    if (dialog?.open) dialog.close()
  }, [location.key])

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


  if (OverlayHeader) {
    return (
      <div className="dashboard-layout dashboard-layout-overlay">
        <dialog
          id={sidebarDialogId}
          ref={sidebarDialog}
          className="dashboard-sidebar-dialog"
          aria-label="Dashboard navigation"
          onClose={closeSidebar}
          onClick={event => {
            if (event.target === event.currentTarget) sidebarDialog.current.close()
          }}
        >
          <Sidebar isOpen={sidebarOpen} onClose={() => sidebarDialog.current.close()} />
        </dialog>

        <div className="dashboard-workspace">
          <OverlayHeader
            menuId={sidebarDialogId}
            menuOpen={sidebarOpen}
            onMenuClick={() => {
              sidebarDialog.current.showModal()
              openSidebar()
            }}
          />
          <main className="dashboard-main">{children}</main>
        </div>
      </div>
    )
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
