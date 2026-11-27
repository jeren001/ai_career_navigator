import { useState } from 'react'
import { accentColors, isHexColor } from './designDefaults'

export default function ColorPicker({ accent, onChange }) {
  const [draft, setDraft] = useState(null)

  function update(text) {
    const value = text.trim()
    if (isHexColor(value)) {
      onChange(value.toUpperCase())
      setDraft(null)
    } else {
      setDraft(text)
    }
  }

  return (
    <fieldset className="cv-design-group">
      <legend>Accent color</legend>
      <div className="cv-design-swatches">
        {accentColors.map(color => (
          <button
            key={color}
            type="button"
            style={{ '--swatch-color': color }}
            onClick={() => { setDraft(null); onChange(color) }}
            aria-label={`Set accent to ${color}`}
            aria-pressed={accent.toUpperCase() === color}
          />
        ))}
      </div>
      <label className="cv-gallery-field">
        <span>Custom HEX color</span>
        <input
          value={draft ?? accent}
          onChange={event => update(event.target.value)}
          placeholder="#071B60"
          spellCheck={false}
          aria-invalid={draft !== null}
        />
      </label>
      {draft !== null && <p role="alert">Enter a six-digit HEX color, for example #071B60.</p>}
    </fieldset>
  )
}
