import { useEffect, useId, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Trash2, X } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import { cvRepository } from '../../services/cvRepository'
import { isCVWorkspaceActive } from '../../services/cvWorkspace'
import { getCVNotificationTarget, unavailableCVMessage } from '../cv-builder/cvNotificationNavigation'
import { useNotifications } from '../../context/useNotifications'
import DeleteNotificationsDialog from './DeleteNotificationsDialog'
import NotificationItem from './NotificationItem'

const filters = ['all', 'unread']

export default function NotificationCenter({ onClose }) {
  const {
    notifications, unreadCount, error, markAsRead, markAsUnread, markAllAsRead,
    deleteNotification, deleteAllNotifications
  } = useNotifications()
  const [filter, setFilter] = useState('all')
  const [bulkDeletion, setBulkDeletion] = useState(null)
  const [resourceError, setResourceError] = useState('')
  const { cvWorkspace: workspaceId } = useUser()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pendingResource = useRef(null)
  const bulkTrigger = useRef(null)
  const tabs = useRef({})
  const filterId = useId()
  const shown = filter === 'unread' ? notifications.filter(item => item.readAt === null) : notifications
  const empty = notifications.length === 0

  useEffect(() => () => { pendingResource.current = null }, [workspaceId, pathname])

  async function openResource(item) {
    const target = getCVNotificationTarget(item)
    if (!target || pendingResource.current) return

    const request = { workspaceId, notificationId: item.id, target }
    pendingResource.current = request
    setResourceError('')
    try {
      const cv = await cvRepository.get(workspaceId, target.id)
      if (pendingResource.current !== request || !isCVWorkspaceActive(workspaceId)) return
      if (!cv?.data) {
        setResourceError(unavailableCVMessage)
        return
      }

      // Use the router for same-route openings too so the editor's blocker can intervene.
      await navigate('/resume', {
        replace: pathname === '/resume',
        state: { cvNotification: request }
      })
    } catch {
      if (pendingResource.current === request && isCVWorkspaceActive(workspaceId)) {
        setResourceError(unavailableCVMessage)
      }
    } finally {
      if (pendingResource.current === request) pendingResource.current = null
    }
  }

  function navigateTabs(event) {
    const next = {
      ArrowLeft: filter === 'all' ? 'unread' : 'all',
      ArrowRight: filter === 'all' ? 'unread' : 'all',
      Home: 'all',
      End: 'unread'
    }[event.key]
    if (!next) return

    event.preventDefault()
    setFilter(next)
    tabs.current[next]?.focus()
  }

  function changeReadState(item, button) {
    const unread = item.readAt === null
    const saved = unread ? markAsRead(item.id) : markAsUnread(item.id)
    if (saved && unread && filter === 'unread') {
      focusAfterRemoval(button, '.notification-item-read-action')
    }
  }

  function focusAfterRemoval(button, selector) {
    if (document.activeElement !== button) return

    const row = button.closest('li')
    const adjacentRow = row.nextElementSibling ?? row.previousElementSibling
    const next = adjacentRow?.querySelector(selector) ?? tabs.current[filter]
    next?.focus()
  }

  function deleteItem(id, button) {
    if (!deleteNotification(id)) return
    if (pendingResource.current?.notificationId === id) pendingResource.current = null
    focusAfterRemoval(button, '.notification-item-delete')
  }

  function openBulkDeletion() {
    // Keep the confirmation bound to the workspace that opened it.
    setBulkDeletion({
      confirm: () => {
        if (!deleteAllNotifications()) return false
        pendingResource.current = null
        return true
      }
    })
  }

  function closeBulkDeletion(deleted) {
    setBulkDeletion(null)
    const button = bulkTrigger.current
    const next = !deleted && button && !button.disabled ? button : tabs.current[filter]
    next?.focus()
  }

  function readAll(event) {
    if (markAllAsRead() && document.activeElement === event.currentTarget) {
      tabs.current[filter]?.focus()
    }
  }

  return (
    <>
      <header className="notification-center-header">
        <h2>Notifications</h2>
        <button type="button" onClick={onClose} aria-label="Close notifications" title="Close notifications">
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      <div className="notification-center-toolbar">
        <div role="tablist" aria-label="Filter notifications" className="notification-center-tabs">
          {filters.map(value => (
            <button
              key={value}
              ref={element => { tabs.current[value] = element }}
              id={`${filterId}-${value}`}
              type="button"
              role="tab"
              aria-selected={filter === value}
              aria-controls={`${filterId}-${value}-panel`}
              tabIndex={filter === value ? 0 : -1}
              onClick={() => setFilter(value)}
              onKeyDown={navigateTabs}
            >
              {value === 'all' ? 'All' : <>Unread <span>{unreadCount}</span></>}
            </button>
          ))}
        </div>
        <button type="button" className="notification-center-action" onClick={readAll} disabled={unreadCount === 0}>
          <CheckCheck size={16} aria-hidden="true" /> Mark all as read
        </button>
      </div>

      <p className="notification-center-error" role="status">{resourceError || error}</p>

      {filters.map(value => (
        <div
          key={value}
          className="notification-center-feed"
          id={`${filterId}-${value}-panel`}
          role="tabpanel"
          aria-labelledby={`${filterId}-${value}`}
          hidden={filter !== value}
          tabIndex={filter === value ? 0 : -1}
        >
          {filter === value && (shown.length > 0 ? (
            <ul className="notification-center-list">
              {shown.map(item => (
                <NotificationItem key={item.id} item={item} onReadChange={changeReadState} onDelete={deleteItem}
                  onOpen={getCVNotificationTarget(item) ? () => openResource(item) : undefined} />
              ))}
            </ul>
          ) : (
            <div className="notification-center-empty">
              <Bell size={22} aria-hidden="true" />
              <h3>{empty ? 'No notifications' : 'No unread notifications'}</h3>
              <p>You're all caught up!</p>
            </div>
          ))}
        </div>
      ))}

      <footer className="notification-center-footer">
        <button ref={bulkTrigger} type="button" className="notification-center-action"
          onClick={openBulkDeletion} disabled={empty} aria-haspopup="dialog">
          <Trash2 size={16} aria-hidden="true" /> Delete all notifications
        </button>
      </footer>
      {bulkDeletion && <DeleteNotificationsDialog onConfirm={bulkDeletion.confirm} onClose={closeBulkDeletion} />}
    </>
  )
}
