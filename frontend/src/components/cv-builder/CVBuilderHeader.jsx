import { useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'
import mascot from '../../assets/mascot.png'
import Sidebar from '../dashboard/Sidebar'
import NotificationsMenu from '../dashboard/NotificationsMenu'
import { Bell } from 'lucide-react'
import { useLocale } from '../../lib/locale.js'

export default function CVBuilderHeader({ isHome, notificationsOpen, onNotificationsOpenChange }) {
  const { t } = useLocale()
  const drawer = useRef(null)
  const menuButton = useRef(null)
  const drawerId = useId()
  const [open, setOpen] = useState(false)
  const Title = isHome ? 'h1' : 'p'

  function openDrawer() {
    onNotificationsOpenChange(false)
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
        <Title className="cv-builder-title">{t('CV Builder', '简历制作')}</Title>
        <p className="cv-builder-description">{t('Create, improve and personalize your CV for your next career opportunity.', '创建、完善并定制你的求职简历。')}</p>
      </div>

      <div className="dashboard-notifications">
        <button className="notification-button" type="button"
          aria-label={t('Notifications', '通知')} aria-expanded={notificationsOpen}
          onClick={() => onNotificationsOpenChange(!notificationsOpen)}><Bell size={23} /></button>
        {notificationsOpen && <NotificationsMenu />}
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
