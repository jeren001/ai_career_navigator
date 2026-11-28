import { useId } from 'react'
import { twoColumnRestriction } from './designDefaults'

export default function LayoutSettings({ template, columns, requestedColumns, onChange }) {
  const id = useId()
  const restriction = twoColumnRestriction(template)

  return (
    <fieldset className="cv-design-group">
      <legend>Layout</legend>
      <label className="cv-gallery-field">
        <span>Column layout</span>
        <select value={columns} onChange={event => onChange(event.target.value)} aria-describedby={restriction ? id : undefined}>
          <option value="one">One Column</option>
          <option value="two" disabled={Boolean(restriction)}>Two Columns</option>
        </select>
      </label>
      {restriction && <p id={id}>{restriction}{requestedColumns === 'two' && ' Your two-column preference will resume on compatible templates.'}</p>}
    </fieldset>
  )
}
