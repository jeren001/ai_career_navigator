import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react'

export default function PreviewPagination({ current, total, onNavigate }) {
  const buttons = [
    ['First page', ChevronFirst, 1, current === 1],
    ['Previous page', ChevronLeft, current - 1, current === 1],
    ['Next page', ChevronRight, current + 1, current === total],
    ['Last page', ChevronLast, total, current === total]
  ]

  function renderButton([label, Icon, target, disabled]) {
    return (
      <button key={label} type="button" aria-label={label} title={label} disabled={disabled} onClick={() => onNavigate(target)}>
        <Icon size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <nav className="cv-preview-group cv-preview-pagination" aria-label="CV preview pages">
      {buttons.slice(0, 2).map(renderButton)}
      <div className="cv-preview-page-count">
        <select aria-label="Go to page" value={current} onChange={event => onNavigate(Number(event.target.value))} disabled={total <= 1}>
          {Array.from({ length: total }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
        <span aria-label={`of ${total} pages`}>/ {total}</span>
      </div>
      {buttons.slice(2).map(renderButton)}
    </nav>
  )
}
