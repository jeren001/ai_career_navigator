import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import logo from '../../assets/mascot.png'
import Sidebar from '../dashboard/Sidebar'

export default function InterviewHeader() {
  const drawer = useRef(null)
  const menuButton = useRef(null)
  const drawerId = useId()
  const [open, setOpen] = useState(false)

  function openDrawer() {
    menuButton.current?.focus()
    drawer.current.showModal()
    setOpen(true)
    drawer.current.querySelector('.sidebar-close-button')?.focus()
  }

  function closeDrawer() {
    drawer.current.close()
  }

  return (
    <header className="interview-header">
      <button ref={menuButton} type="button" className="interview-menu-button"
        aria-label="Open navigation menu" aria-haspopup="dialog" aria-controls={drawerId}
        aria-expanded={open} onClick={openDrawer}>
        <Menu size={28} strokeWidth={2} aria-hidden="true" />
      </button>
      <Link to="/" className="interview-home-link" aria-label="AI Career home">
        <img src={logo} alt="" />
      </Link>
      <h1>Interview Simulator</h1>
      <dialog id={drawerId} ref={drawer} className="interview-drawer" aria-label="Navigation menu"
        onClick={event => { if (event.target === event.currentTarget) closeDrawer() }}
        onClose={() => setOpen(false)}>
        <Sidebar isOpen={open} onClose={closeDrawer} />
      </dialog>
    </header>
  )
}
