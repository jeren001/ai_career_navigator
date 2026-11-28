// ==========================================
// PROJECT: AI CAREER
// FILE: App.jsx
// PURPOSE: Application routing
// ==========================================

// Import React Router
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Import global user context
import { UserProvider } from './context/UserContext'

// Import application pages
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'
import Settings from './pages/Settings'

import AIAssistant from './pages/AIAssistant'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
  {
    path: '/profile',
    lazy: async () => ({ Component: (await import('./pages/MyProfile')).default }),
    hydrateFallbackElement: <p role="status">Loading profile…</p>
  },
  { path: '/about', element: <About /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/settings', element: <Settings /> },
  { path: '/ai-assistant', element: <AIAssistant /> },
  {
    path: '/interview-simulator',
    lazy: async () => ({ Component: (await import('./pages/InterviewSimulator')).default }),
    hydrateFallbackElement: <p role="status">Loading Interview Simulator…</p>
  },
  {
    path: '/interview-simulator/technical',
    lazy: async () => ({ Component: (await import('./pages/TechnicalInterviewSetup')).default }),
    hydrateFallbackElement: <p role="status">Loading Technical Interview setup…</p>
  },
  {
    path: '/interview-simulator/behavioral',
    lazy: async () => ({ Component: (await import('./pages/BehavioralInterviewSetup')).default }),
    hydrateFallbackElement: <p role="status">Loading Behavioral Interview setup…</p>
  },
  {
    path: '/interview-simulator/general',
    lazy: async () => ({ Component: (await import('./pages/GeneralInterviewSetup')).default }),
    hydrateFallbackElement: <p role="status">Loading General Interview setup…</p>
  },
  {
    path: '/interview-simulator/custom',
    lazy: async () => ({ Component: (await import('./pages/CustomInterviewSetup')).default }),
    hydrateFallbackElement: <p role="status">Loading Custom Interview setup…</p>
  },
  {
    path: '/interview-simulator/session',
    lazy: async () => ({ Component: (await import('./pages/InterviewSession')).default }),
    hydrateFallbackElement: <p role="status">Loading interview session…</p>
  },
  {
    path: '/interview-simulator/history',
    lazy: async () => ({ Component: (await import('./pages/InterviewHistory')).default }),
    hydrateFallbackElement: <p role="status">Loading interview history…</p>
  },
  {
    path: '/interview-simulator/progress',
    lazy: async () => ({ Component: (await import('./pages/InterviewProgress')).default }),
    hydrateFallbackElement: <p role="status">Loading Progress &amp; Performance…</p>
  },
  {
    path: '/interview-simulator/results/:sessionId',
    lazy: async () => ({ Component: (await import('./pages/InterviewResults')).default }),
    hydrateFallbackElement: <p role="status">Loading interview results…</p>
  },
  {
    path: '/resume',
    lazy: async () => ({ Component: (await import('./pages/CVBuilder')).default }),
    hydrateFallbackElement: <p role="status">Loading CV Builder…</p>
  },
  { path: '*', element: null }
])

function App() {
  return (
    <UserProvider>
      <RouterProvider router={router} />
    </UserProvider>
  )
}

export default App
