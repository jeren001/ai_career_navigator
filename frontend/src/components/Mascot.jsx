
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Mascot
// PURPOSE: Display the AI CAREER robot
// ==========================================

// Import the mascot image
import mascot from '../assets/mascot.png'

// Mascot component
function Mascot() {
  return (
    <div className="mascot-container">

      {/* AI CAREER robot illustration */}
      <img
        src={mascot}
        alt="AI CAREER robot mascot"
        className="mascot-image"
      />

    </div>
  )
}

// Export the component
export default Mascot
