
// ==========================================
// PROJECT: AI CAREER
// FILE: App.jsx
// PURPOSE: Application routing
// ==========================================

// Import React Router
import { BrowserRouter, Routes, Route } from 'react-router-dom'

// Import application pages
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import About from './pages/About'
import SignIn from './pages/SignIn'
import SignUp from './pages/SignUp'

// Main application component
function App() {
  return (
    <BrowserRouter>

      {/* Define application routes */}
      <Routes>

        {/* Home Page */}
        <Route path="/" element={<Home />} />

        {/* Dashboard Page */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* About Page */}
        <Route path="/about" element={<About />} />

        {/* Sign In Page */}
        <Route path="/signin" element={<SignIn />} />

        {/* Create an Account Page */}
        <Route path="/signup" element={<SignUp />} />

      </Routes>

    </BrowserRouter>
  )
}

// Export the application
export default App
