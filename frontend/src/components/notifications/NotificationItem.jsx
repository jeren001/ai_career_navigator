import { Bell, Briefcase, ChevronRight, FileText, GraduationCap, Mail, MailOpen, Shield, Trash2 } from 'lucide-react'

const categoryIcons = {
  cv: FileText,
  career: Briefcase,
  job: Briefcase,
  learning: GraduationCap,
  account: Shield,
  security: Shield
}

const timestampFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export default function NotificationItem({ item, onReadChange, onDelete, onOpen }) {
  const unread = item.readAt === null
  const readAction = unread ? 'Mark as read' : 'Mark as unread'
  const ReadIcon = unread ? MailOpen : Mail
  const category = item.type.split('.')[0]
  const Icon = Object.hasOwn(categoryIcons, category) ? categoryIcons[category] : Bell

  return (
    <li className="notification-center-item" data-unread={unread || undefined}>
      <span className="notification-item-icon"><Icon size={18} aria-hidden="true" /></span>
      <div className="notification-item-content" data-navigable={Boolean(onOpen) || undefined}>
        <h3 dir="auto">{item.title}</h3>
        <p dir="auto">{item.description}</p>
        <div className="notification-item-meta">
          <time dateTime={item.createdAt}>{timestampFormat.format(new Date(item.createdAt))}</time>
          {unread && <span className="notification-item-unread">Unread</span>}
        </div>
        {onOpen && (
          <button type="button" className="notification-item-open" onClick={onOpen} aria-label={`Open CV: ${item.title}`}>
            <ChevronRight size={15} aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="notification-item-actions">
        <button type="button" className="notification-item-read-action"
          onClick={event => onReadChange(item, event.currentTarget)}
          aria-label={`${readAction}: ${item.title}`} title={readAction}>
          <ReadIcon size={16} aria-hidden="true" />
        </button>
        <button type="button" className="notification-item-delete"
          onClick={event => onDelete(item.id, event.currentTarget)}
          aria-label={`Delete notification: ${item.title}`} title="Delete notification">
          <Trash2 size={16} aria-hidden="true" />
        </button>
      </div>
    </li>
  )
}
