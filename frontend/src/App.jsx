// ==========================================
// PROJECT: AI CAREER
// FILE: App.jsx
// PURPOSE: Application routing
// ==========================================

// Import React Router
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Import global user context
import { UserProvider } from './context/UserContext'
import { NotificationProvider } from './context/NotificationContext'

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
  { path: '*', element: null }
])

function App() {
  return (
    <UserProvider>
      <NotificationProvider>
        <RouterProvider router={router} />
      </NotificationProvider>
    </UserProvider>
  )
}

export default App
