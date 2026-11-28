import { useCallback, useEffect, useId, useLayoutEffect, useRef } from 'react'
import { Bell } from 'lucide-react'
import { useNotifications } from '../../context/useNotifications'
import NotificationCenter from './NotificationCenter'
import '../../styles/notifications.css'

export default function NotificationBell({ open, onOpenChange }) {
  const { unreadCount } = useNotifications()
  const root = useRef(null)
  const trigger = useRef(null)
  const panel = useRef(null)
  const panelId = useId()
  const label = `Notifications, ${unreadCount} unread`

  const closeAndFocus = useCallback(() => {
    onOpenChange(false)
    trigger.current?.focus()
  }, [onOpenChange])

  useLayoutEffect(() => {
    if (!open) return

    const element = panel.current
    function positionPanel() {
      const anchor = trigger.current.getBoundingClientRect()
      const { clientWidth, clientHeight } = document.documentElement
      const edge = 12
      const gap = 8
      element.style.maxWidth = `${Math.max(0, clientWidth - 2 * edge)}px`
      const left = Math.max(edge, Math.min(anchor.right, clientWidth - edge) - element.offsetWidth)
      element.style.left = `${left - anchor.left}px`
      element.style.maxHeight = `${Math.max(0, clientHeight - anchor.bottom - gap - edge)}px`
    }

    function handleScroll(event) {
      if (!element.contains(event.target)) positionPanel()
    }

    positionPanel()
    window.addEventListener('resize', positionPanel)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      window.removeEventListener('resize', positionPanel)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return

    function closeOutside(event) {
      if (!root.current?.contains(event.target)) onOpenChange(false)
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault()
      closeAndFocus()
    }

    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open, onOpenChange, closeAndFocus])

  return (
    <div ref={root} className="notification-bell">
      <button
        ref={trigger}
        type="button"
        className="notification-bell-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-controls={panelId}
        title={label}
        onClick={() => onOpenChange(!open)}
      >
        <Bell size={22} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notification-bell-count" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      <section ref={panel} id={panelId} className="notification-bell-panel" aria-label="Notifications" hidden={!open}>
        {open && <NotificationCenter onClose={closeAndFocus} />}
      </section>
    </div>
  )
}
