
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: WaveBackground
// PURPOSE: Decorative colorful bottom waves
// ==========================================

function WaveBackground() {
  return (
    <div className="wave-background" aria-hidden="true">

      <svg
        viewBox="0 0 1440 220"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >

        {/* Wave color gradients */}
        <defs>

          {/* Purple gradient */}
          <linearGradient id="purpleWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e5d0ff" />
            <stop offset="100%" stopColor="#a7dfff" />
          </linearGradient>

          {/* Blue gradient */}
          <linearGradient id="blueWave" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#eaf4ff" />
            <stop offset="100%" stopColor="#65a5ff" />
          </linearGradient>

          {/* Cyan gradient */}
          <linearGradient id="cyanWave" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d9f5ff" />
            <stop offset="100%" stopColor="#00c9ef" />
          </linearGradient>

          {/* Yellow gradient */}
          <linearGradient id="yellowWave" x1="0%" y1="100%" x2="60%" y2="0%">
            <stop offset="0%" stopColor="#a9e4ff" />
            <stop offset="55%" stopColor="#fff1c2" />
            <stop offset="100%" stopColor="#ffde42" />
          </linearGradient>

        </defs>

        {/* Blue wave */}
        <path
          d="M0 220 C250 220 360 15 560 65 S870 220 1100 100 S1350 100 1440 60 V220 Z"
          fill="url(#blueWave)"
        />

        {/* Cyan wave */}
        <path
          d="M0 220 C450 220 680 200 920 90 S1180 50 1440 130 V220 Z"
          fill="url(#cyanWave)"
        />

        {/* Purple wave */}
        <path
          d="M0 85 C200 10 310 205 590 190 S950 130 1120 120 S1350 150 1440 150 V220 H0 Z"
          fill="url(#purpleWave)"
          opacity="0.85"
        />

        {/* Yellow wave */}
        <path
          d="M730 220 C950 200 1120 210 1260 95 S1390 5 1440 0 V220 Z"
          fill="url(#yellowWave)"
        />

      </svg>

    </div>
  )
}

// Export the component
export default WaveBackground
