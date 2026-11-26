// ==========================================
// PROJECT: AI CAREER
// FILE: App.jsx
// PURPOSE: Application routing
// ==========================================

// Import React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom'

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

// Main application component

function App() {

  return (

    <UserProvider>

      <BrowserRouter>

        {/* Define application routes */}

        <Routes>

          {/* Home Page */}
          <Route path="/" element={<Home />} />

          {/* Dashboard Page */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* My Profile Page */}
          <Route path="/profile" element={<MyProfile />} />

          {/* About Page */}
          <Route path="/about" element={<About />} />

          {/* Sign In Page */}
          <Route path="/signin" element={<SignIn />} />

          {/* Create an Account Page */}
          <Route path="/signup" element={<SignUp />} />

          {/* Settings Page */}
          <Route path="/settings" element={<Settings />} />

          {/* AI Assistant Page */}
          <Route path="/ai-assistant" element={<AIAssistant />} />

        </Routes>

      </BrowserRouter>

    </UserProvider>

  )

}

// Export the application
export default App