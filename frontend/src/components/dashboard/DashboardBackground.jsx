
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Dashboard Background
// PURPOSE: Decorative responsive background
// ==========================================

function DashboardBackground() {

  return (
    <div className="dashboard-background" aria-hidden="true">

      {/* Decorative background waves */}
      <svg
        className="dashboard-background-waves"
        viewBox="0 0 1200 900"
        preserveAspectRatio="none"
      >

        <defs>

          {/* Blue gradient */}
          <linearGradient id="blueWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C5F2FF" />
            <stop offset="100%" stopColor="#00C9EF" />
          </linearGradient>

          {/* Yellow gradient */}
          <linearGradient id="yellowWave" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF4B0" />
            <stop offset="100%" stopColor="#FFD500" />
          </linearGradient>

        </defs>

        {/* Top right blue wave */}
        <path
          d="M1200 0 H1030
             C920 150 790 10 670 160
             C550 310 680 420 900 390
             C1080 370 1160 250 1200 180 Z"
          fill="url(#blueWave)"
          opacity="0.55"
        />

        {/* Bottom blue wave */}
        <path
          d="M0 900
             C230 720 350 630 560 700
             C830 790 1050 610 1200 420
             V900 Z"
          fill="url(#blueWave)"
        />

        {/* Light blue wave */}
        <path
          d="M280 900
             C480 710 680 760 850 710
             C1050 650 1130 530 1200 480
             V900 Z"
          fill="#C5F2FF"
          opacity="0.85"
        />

        {/* Bottom yellow wave */}
        <path
          d="M520 900
             C740 730 860 840 1010 720
             C1100 650 1150 590 1200 570
             V900 Z"
          fill="url(#yellowWave)"
        />

      </svg>

      {/* Decorative stars */}
      <span className="dashboard-star star-one">✦</span>
      <span className="dashboard-star star-two">✦</span>
      <span className="dashboard-star star-three">✦</span>
      <span className="dashboard-star star-four">✦</span>
      <span className="dashboard-star star-five">✦</span>

    </div>
  )
}

export default DashboardBackground
