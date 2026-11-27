// ==========================================
// PROJECT: AI CAREER
// FILE: App.jsx
// PURPOSE: Application routing
// ==========================================

// Import React Router
import { createBrowserRouter, replace, RouterProvider } from 'react-router-dom'

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
    path: '/resume',
    lazy: async () => ({ Component: (await import('./pages/CVBuilder')).default }),
    hydrateFallbackElement: <p role="status">Loading CV Builder…</p>
  },
  {
    path: '/career-test',
    lazy: async () => ({ Component: (await import('./pages/CareerTest')).default }),
    hydrateFallbackElement: <p role="status">Loading Career Test…</p>,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import('./components/career-test/home/CareerTestHome')).default })
      },
      {
        path: 'assessment',
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('./components/career-test/assessment/Assessment')).default })
          }
        ]
      },
      {
        path: 'profile',
        lazy: async () => ({ Component: (await import('./components/career-test/profile/CareerProfile')).default })
      },
      {
        path: 'guidance',
        lazy: async () => ({ Component: (await import('./components/career-test/guidance/CareerGuidance')).default })
      }
    ]
  },
  {
    path: '/assessment',
    element: null,
    hydrateFallbackElement: <p role="status">Loading assessment…</p>,
    loader: () => replace('/career-test/assessment')
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
