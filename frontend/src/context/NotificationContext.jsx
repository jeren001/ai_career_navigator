import { useCallback, useEffect, useMemo, useState } from 'react'
import { useUser } from './UserContext'
import { NotificationContext } from './useNotifications'
import { isCVWorkspaceActive } from '../services/cvWorkspace'
import { notificationRepository } from '../services/notificationRepository'

const emptyNotifications = Object.freeze([])
const unavailableMessage = 'Notifications are unavailable in this workspace.'
const storageMessage = 'Notifications could not be accessed or saved in this browser.'
const recoveredMessage = 'Some stored notifications could not be recovered.'

export function NotificationProvider({ children }) {
  const { cvWorkspace: workspaceId } = useUser()
  const [snapshot, setSnapshot] = useState(null)

  const run = useCallback((operation, ...args) => {
    // A callback held by an earlier route or operation may belong to a signed-out workspace.
    if (!isCVWorkspaceActive(workspaceId)) {
      setSnapshot(previous => previous?.workspaceId === workspaceId ? null : previous)
      return false
    }

    try {
      const { notifications, recovered } = notificationRepository[operation](workspaceId, ...args)
      setSnapshot({ workspaceId, notifications, error: recovered ? recoveredMessage : null })
      return true
    } catch {
      setSnapshot(previous => ({
        workspaceId,
        notifications: previous?.workspaceId === workspaceId ? previous.notifications : emptyNotifications,
        error: storageMessage
      }))
      return false
    }
  }, [workspaceId])

  useEffect(() => {
    let cancelled = false
    // Defer external storage hydration and discard work for an obsolete scope.
    queueMicrotask(() => {
      if (!cancelled) run('list')
    })
    return () => { cancelled = true }
  }, [run])

  const active = isCVWorkspaceActive(workspaceId)
  const current = active && snapshot?.workspaceId === workspaceId ? snapshot : null
  const notifications = current?.notifications ?? emptyNotifications
  const error = active ? current?.error ?? null : unavailableMessage

  const value = useMemo(() => ({
    notifications,
    unreadCount: notifications.filter(notification => notification.readAt === null).length,
    error,
    publish: notification => run('publish', notification),
    refresh: () => run('list'),
    markAsRead: id => run('setRead', id, true),
    markAsUnread: id => run('setRead', id, false),
    markAllAsRead: () => run('markAllAsRead'),
    deleteNotification: id => run('remove', id),
    deleteAllNotifications: () => run('removeAll')
  }), [notifications, error, run])

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}
