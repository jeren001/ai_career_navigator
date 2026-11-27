import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import mascot from '../../../assets/mascot.png'

export default function CareerTestHeader({ menuId, menuOpen, onMenuClick }) {
  return (
    <header className="career-test-header">
      <button
        type="button"
        className="career-test-menu-button"
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        aria-expanded={menuOpen}
        aria-controls={menuId}
        onClick={event => {
          event.currentTarget.focus()
          onMenuClick()
        }}
      >
        <Menu aria-hidden="true" />
      </button>
      <Link className="career-test-brand" to="/career-test">
        <img src={mascot} alt="" width="1491" height="1055" />
        <span>AI Career Test</span>
      </Link>
    </header>
  )
}
