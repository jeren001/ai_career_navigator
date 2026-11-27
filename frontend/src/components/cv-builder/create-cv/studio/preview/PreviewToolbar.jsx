import { Expand, Maximize, Minimize, Minus, Plus } from 'lucide-react'

const levels = Array.from({ length: 36 }, (_, index) => 25 + index * 5)

export default function PreviewToolbar({ mode, zoom, scale, expanded, onZoom, onMode, onFullscreen }) {
  const percent = Math.round(scale * 100)
  const stepFrom = mode === 'manual' ? zoom : Math.round(percent / 5) * 5
  const step = delta => onZoom(Math.max(25, Math.min(200, stepFrom + delta)))

  return (
    <div className="cv-preview-controls" role="group" aria-label="Preview tools">
      <button type="button" aria-label="Zoom out" onClick={() => step(-5)} disabled={percent <= 25}><Minus size={17} aria-hidden="true" /></button>
      <select aria-label="Zoom percentage" value={mode === 'manual' ? zoom : 'fit'} onChange={event => onZoom(Number(event.target.value))}>
        {mode !== 'manual' && <option value="fit" disabled>{percent}%</option>}
        {levels.map(level => <option key={level} value={level}>{level}%</option>)}
      </select>
      <button type="button" aria-label="Zoom in" onClick={() => step(5)} disabled={percent >= 200}><Plus size={17} aria-hidden="true" /></button>
      <button type="button" aria-pressed={mode === 'width'} onClick={() => onMode('width')}>Fit Width</button>
      <button type="button" aria-pressed={mode === 'page'} onClick={() => onMode('page')}><Expand size={16} aria-hidden="true" /> Fit Page</button>
      <button type="button" aria-pressed={mode === 'actual'} onClick={() => onMode('actual')}>Actual Size</button>
      <button type="button" data-preview-fullscreen onClick={onFullscreen}>
        {expanded ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
        {expanded ? 'Exit Fullscreen' : 'Fullscreen'}
      </button>
    </div>
  )
}
