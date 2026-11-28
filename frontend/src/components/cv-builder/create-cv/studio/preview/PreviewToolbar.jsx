import { ArrowLeftRight, Expand, Maximize, Minimize, Minus, Plus, ScanLine } from 'lucide-react'

const levels = Array.from({ length: 36 }, (_, index) => 25 + index * 5)
const displayModes = [
  ['width', 'Fit Width', ArrowLeftRight],
  ['page', 'Fit Page', Expand],
  ['actual', 'Actual Size', ScanLine]
]

export default function PreviewToolbar({ mode, zoom, scale, expanded, onZoom, onMode, onFullscreen, children }) {
  const percent = Math.round(scale * 100)
  const stepFrom = mode === 'manual' ? zoom : Math.round(percent / 5) * 5
  const step = delta => onZoom(Math.max(25, Math.min(200, stepFrom + delta)))
  const FullscreenIcon = expanded ? Minimize : Maximize
  const fullscreenLabel = expanded ? 'Exit Fullscreen' : 'Fullscreen'

  return (
    <div className="cv-preview-controls" role="group" aria-label="Preview tools">
      <div className="cv-preview-group cv-preview-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => step(-5)} disabled={percent <= 25}>
          <Minus size={16} aria-hidden="true" />
        </button>
        <select aria-label="Zoom percentage" value={mode === 'manual' ? zoom : 'fit'} onChange={event => onZoom(Number(event.target.value))}>
          {mode !== 'manual' && <option value="fit" disabled>{percent}%</option>}
          {levels.map(level => <option key={level} value={level}>{level}%</option>)}
        </select>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => step(5)} disabled={percent >= 200}>
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="cv-preview-group cv-preview-display" role="group" aria-label="Display">
        {displayModes.map(([value, label, Icon]) => (
          <button key={value} type="button" aria-label={label} title={label} aria-pressed={mode === value} onClick={() => onMode(value)}>
            <Icon size={16} aria-hidden="true" />
          </button>
        ))}
        <button type="button" data-preview-fullscreen aria-label={fullscreenLabel} title={fullscreenLabel} onClick={onFullscreen}>
          <FullscreenIcon size={16} aria-hidden="true" />
        </button>
      </div>
      {children}
    </div>
  )
}
