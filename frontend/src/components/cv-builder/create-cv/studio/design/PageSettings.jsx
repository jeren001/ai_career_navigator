import { pageDimensions } from './designDefaults'

export default function PageSettings({ design, onChange }) {
  return (
    <fieldset className="cv-design-group">
      <legend>Page settings</legend>
      <label className="cv-gallery-field">
        <span>Page size</span>
        <select value={design.pageSize} onChange={event => onChange({ pageSize: event.target.value })}>
          {Object.entries(pageDimensions).map(([size, [width, height]]) => (
            <option key={size} value={size}>{size} ({width} × {height} mm)</option>
          ))}
        </select>
      </label>
      <label className="cv-gallery-field">
        <span>Page margins ({design.margins} mm)</span>
        <input type="range" min="5" max="30" value={design.margins} onChange={event => onChange({ margins: Number(event.target.value) })} />
      </label>
    </fieldset>
  )
}
