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
      <button key={label} type="button" aria-label={label} disabled={disabled} onClick={() => onNavigate(target)}>
        <Icon size={18} aria-hidden="true" />
      </button>
    )
  }

  return (
    <nav className="cv-preview-controls cv-preview-pagination" aria-label="CV preview pages">
      {buttons.slice(0, 2).map(renderButton)}
      <label>
        Page
        <select aria-label="Go to page" value={current} onChange={event => onNavigate(Number(event.target.value))} disabled={total <= 1}>
          {Array.from({ length: total }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select>
        <span>of {total}</span>
      </label>
      {buttons.slice(2).map(renderButton)}
    </nav>
  )
}
