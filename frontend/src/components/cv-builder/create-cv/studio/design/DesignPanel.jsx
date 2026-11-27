import { useState } from 'react'
import ColorPicker from './ColorPicker'
import LayoutSettings from './LayoutSettings'
import PageSettings from './PageSettings'
import PhotoSettings from './PhotoSettings'
import TypographySettings from './TypographySettings'
import { resolveDesign } from './designDefaults'

export default function DesignPanel({ template, overrides = {}, onChange }) {
  const [resetCount, setResetCount] = useState(0)
  const design = resolveDesign(template, overrides)

  function resetDesign() {
    onChange(previous => previous.photo ? { photo: previous.photo } : {})
    setResetCount(count => count + 1)
  }

  function update(patch) {
    onChange(previous => ({ ...previous, ...patch }))
  }

  return (
    <div className="cv-design-settings">
      <ColorPicker key={resetCount} accent={design.accent} onChange={accent => update({ accent })} />
      <TypographySettings design={design} onChange={update} />
      <PageSettings design={design} onChange={update} />
      <LayoutSettings template={template} columns={design.columns} requestedColumns={overrides.columns} onChange={columns => update({ columns })} />
      <PhotoSettings key={resetCount + '-photo'} photo={overrides.photo} showPhoto={overrides.showPhoto} onChange={update} />
      <button type="button" className="cv-design-action" onClick={resetDesign}>Reset Design</button>
    </div>
  )
}
