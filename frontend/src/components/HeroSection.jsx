
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: HeroSection
// PURPOSE: Main introduction to the platform
// ==========================================

// Import icon and mascot component
import { Star } from 'lucide-react'
import Mascot from './Mascot'
import { Link } from 'react-router-dom'



// Decorative yellow rays
function DecorativeRays() {
  return (
    <svg
      className="decorative-rays"
      viewBox="0 0 40 40"
      aria-hidden="true"
    >
      <path d="M8 16 L12 5" />
      <path d="M18 22 L29 11" />
      <path d="M23 32 L36 28" />
    </svg>
  )
}

// Main Hero Section component
function HeroSection() {
  return (
    <section className="hero-section">

      {/* Left side: introduction and slogan */}
      <div className="hero-text">

        {/* Introductory label */}
        <div className="hero-label">
          <Star size={18} fill="#ffbe00" color="#ffbe00" />
          <span>Your AI Career Guide</span>
        </div>

        {/* Main slogan */}
        <h1 className="hero-title">
          <span>Dream It.</span>
          <span>Discover It.</span>
          <span className="hero-highlight">
            Become It.
          </span>
        </h1>

        {/* Platform description */}
        <p className="hero-description">
          Discover what you're great at, explore
          exciting careers, and build a future
          that's totally you.
        </p>

        {/* Main button with yellow decorative rays */}
        <div className="hero-button-wrapper">

          {/* Navigate to the account registration page */}
        <Link to="/signup" className="hero-button">
        Get Started
        </Link>
          <DecorativeRays />

        </div>

      </div>

      {/* Right side: mascot illustration */}
      <div className="hero-visual">
        <Mascot />
      </div>

    </section>
  )
}

// Export the component
export default HeroSection
