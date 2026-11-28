const fontChoices = {
  'sans-serif': 'Sans serif',
  serif: 'Serif',
  Arial: 'Arial',
  Georgia: 'Georgia',
  Verdana: 'Verdana',
  monospace: 'Monospace'
}

export default function TypographySettings({ design, onChange }) {
  return (
    <fieldset className="cv-design-group">
      <legend>Typography</legend>
      <label className="cv-gallery-field">
        <span>Font family</span>
        <select value={design.fontFamily} onChange={event => onChange({ fontFamily: event.target.value })}>
          {Object.entries(fontChoices).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="cv-gallery-field">
        <span>Font size ({design.fontSize} pt)</span>
        <input type="range" min="8" max="24" step="1" value={design.fontSize} onChange={event => onChange({ fontSize: Number(event.target.value) })} />
      </label>
      <label className="cv-gallery-field">
        <span>Line spacing ({design.lineSpacing})</span>
        <input type="range" min="1" max="2.5" step="0.1" value={design.lineSpacing} onChange={event => onChange({ lineSpacing: Number(event.target.value) })} />
      </label>
    </fieldset>
  )
}
