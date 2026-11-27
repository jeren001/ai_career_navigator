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
import MyProfile from './pages/MyProfile'
import Settings from './pages/Settings'

import AIAssistant from './pages/AIAssistant'

import CVBuilder from './pages/CVBuilder'

const router = createBrowserRouter([
  { path: '/', element: <Home /> },
  { path: '/dashboard', element: <Dashboard /> },
  { path: '/profile', element: <MyProfile /> },
  { path: '/about', element: <About /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/settings', element: <Settings /> },
  { path: '/ai-assistant', element: <AIAssistant /> },
  { path: '/resume', element: <CVBuilder /> },
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
