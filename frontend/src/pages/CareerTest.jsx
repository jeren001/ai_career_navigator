import { Outlet, useMatch } from 'react-router-dom'
import CareerTestHeader from '../components/career-test/layout/CareerTestHeader'
import DashboardLayout from '../components/dashboard/DashboardLayout'
import '../styles/career-test.css'

export default function CareerTest() {
  const isHome = useMatch({ path: '/career-test', end: true })

  return (
    <div className={isHome ? 'career-test career-test-home' : 'career-test'}>
      <DashboardLayout overlayHeader={CareerTestHeader}>
        <div className="career-test-content">
          <Outlet />
        </div>
      </DashboardLayout>
    </div>
  )
}
