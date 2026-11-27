import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import mascot from '../../assets/mascot.png'
import Sidebar from '../dashboard/Sidebar'

export default function CVBuilderHeader({ isHome }) {
  const drawer = useRef(null)
  const menuButton = useRef(null)
  const drawerId = useId()
  const [open, setOpen] = useState(false)
  const Title = isHome ? 'h1' : 'p'

  function openDrawer() {
    drawer.current.showModal()
    setOpen(true)
    drawer.current.querySelector('.sidebar-close-button')?.focus()
  }

  function closeDrawer() {
    drawer.current.close()
  }

  return (
    <header className="cv-builder-header">
      <button ref={menuButton} className="cv-builder-menu-button" type="button"
        aria-label="Open navigation menu" aria-controls={drawerId} aria-expanded={open} onClick={openDrawer}>
        <Menu size={24} aria-hidden="true" />
      </button>
      <Link to="/" className="cv-builder-home-link" aria-label="Back to home page">
        <img src={mascot} alt="" />
      </Link>
      <div className="cv-builder-header-content">
        <Title className="cv-builder-title">CV Builder</Title>
        <p className="cv-builder-description">Create, improve and personalize your CV for your next career opportunity.</p>
      </div>

      <dialog id={drawerId} ref={drawer} className="cv-builder-drawer" aria-label="Navigation menu"
        onClick={event => { if (event.target === event.currentTarget) closeDrawer() }}
        onClose={() => {
          setOpen(false)
          menuButton.current?.focus()
        }}>
        <Sidebar isOpen={open} onClose={closeDrawer} />
      </dialog>
    </header>
  )
}
