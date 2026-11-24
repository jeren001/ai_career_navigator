
// ==========================================
// PROJECT: AI CAREER
// PAGE: Home
// PURPOSE: Main landing page
// ==========================================

// Import Home Page components
import Navbar from '../components/Navbar'
import CommandBar from '../components/CommandBar'
import HeroSection from '../components/HeroSection'
import WaveBackground from '../components/WaveBackground'

// Import Home Page styles
import '../styles/home.css'

// Main Home Page component
function Home() {
  return (
    <div className="home-page">

      {/* 01. Navigation Bar */}
      <Navbar />

      {/* Main page content */}
      <main className="home-content">

        {/* 02. Global Search */}
        <CommandBar />

        {/* 03. Hero Section and Mascot */}
        <HeroSection />

      </main>

      {/* 04. Decorative Bottom Waves */}
      <WaveBackground />

    </div>
  )
}

// Export the Home Page
export default Home
