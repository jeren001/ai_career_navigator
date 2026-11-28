import { isCVWorkspaceActive } from './cvWorkspace.js'

const storagePrefix = 'ai-career.notifications.v1.'
const emptyFeed = () => ({ notifications: [], eventIds: [], recovered: false })

const hasText = value => typeof value === 'string' && value.trim().length > 0
const isTimestamp = value => typeof value === 'string' && Number.isFinite(Date.parse(value))

function normalizeTarget(target) {
  return hasText(target?.kind) && hasText(target?.id) ? { kind: target.kind, id: target.id } : null
}

function normalizeRecord(record) {
  if (!record || ![record.id, record.type, record.title, record.description, record.eventId].every(hasText) ||
      !isTimestamp(record.createdAt) || (record.readAt !== null && !isTimestamp(record.readAt))) {
    return null
  }
  const { id, type, title, description, createdAt, readAt, eventId } = record
  return { id, type, title, description, createdAt, readAt, target: normalizeTarget(record.target), eventId }
}

function requireWorkspace(workspaceId) {
  if (!isCVWorkspaceActive(workspaceId)) throw new Error('Notification workspace is unavailable.')
}

function read(workspaceId) {
  requireWorkspace(workspaceId)
  const stored = window.sessionStorage.getItem(storagePrefix + workspaceId)
  if (stored === null) return emptyFeed()

  // A damaged feed must not prevent the current workspace from using notifications.
  try {
    const { notifications, eventIds } = JSON.parse(stored) ?? {}
    if (!Array.isArray(notifications) || !Array.isArray(eventIds) || !eventIds.every(hasText)) {
      return { ...emptyFeed(), recovered: true }
    }

    const seenIds = new Set()
    const seenEvents = new Set()
    const records = []
    for (const value of notifications) {
      const record = normalizeRecord(value)
      if (!record || seenIds.has(record.id) || seenEvents.has(record.eventId)) continue
      seenIds.add(record.id)
      seenEvents.add(record.eventId)
      records.push(record)
    }
    return {
      notifications: records.sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt)),
      eventIds: [...new Set([...eventIds, ...seenEvents])],
      recovered: records.length !== notifications.length
    }
  } catch {
    return { ...emptyFeed(), recovered: true }
  }
}

function update(workspaceId, transform) {
  const current = read(workspaceId)
  const next = transform(current)
  if (next !== current || current.recovered) {
    requireWorkspace(workspaceId)
    const { notifications, eventIds } = next
    window.sessionStorage.setItem(storagePrefix + workspaceId, JSON.stringify({ notifications, eventIds }))
  }
  return { notifications: next.notifications, recovered: false }
}

export const notificationRepository = {
  list(workspaceId) {
    const { notifications, recovered } = read(workspaceId)
    return { notifications, recovered }
  },

  publish(workspaceId, input) {
    return update(workspaceId, current => {
      const { type, title, description, target, eventId } = input ?? {}
      if (![type, title, description].every(hasText) || (eventId != null && !hasText(eventId))) {
        throw new TypeError('A notification requires a type, title, and description, and any event ID must be non-empty.')
      }

      if (current.eventIds.includes(eventId)) return current
      const id = crypto.randomUUID()
      const record = {
        id, type, title, description,
        createdAt: new Date().toISOString(),
        readAt: null,
        target: normalizeTarget(target),
        eventId: eventId ?? id
      }
      return {
        notifications: [record, ...current.notifications],
        eventIds: [...current.eventIds, record.eventId]
      }
    })
  },

  setRead(workspaceId, id, read) {
    return update(workspaceId, current => {
      const item = current.notifications.find(notification => notification.id === id)
      if (!item || Boolean(item.readAt) === read) return current
      const readAt = read ? new Date().toISOString() : null
      return { ...current, notifications: current.notifications.map(notification =>
        notification.id === id ? { ...notification, readAt } : notification
      ) }
    })
  },

  markAllAsRead(workspaceId) {
    return update(workspaceId, current => {
      if (current.notifications.every(notification => notification.readAt)) return current
      const readAt = new Date().toISOString()
      return { ...current, notifications: current.notifications.map(notification =>
        notification.readAt ? notification : { ...notification, readAt }
      ) }
    })
  },

  // Retain event IDs so a retried event cannot restore a dismissed notification.
  remove(workspaceId, id) {
    return update(workspaceId, current => ({
      ...current,
      notifications: current.notifications.filter(notification => notification.id !== id)
    }))
  },

  removeAll(workspaceId) {
    return update(workspaceId, current => ({ ...current, notifications: [] }))
  }
}
