import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { resolveDesign } from '../design/designDefaults'
import EditSectionPanel from './EditSectionPanel'
import SectionItem from './SectionItem'
import { availableSections, sectionHasContent, standardSections } from './sectionCatalog'
import { getSectionGroups, reorderGroup } from './sectionDefaults'

function updateSetting(config, id, patch) {
  return { ...config, settings: { ...config.settings, [id]: { ...config.settings?.[id], ...patch } } }
}

export default function SectionsPanel({ cvData, template, onChange, validateStep, onEditingChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editor, setEditor] = useState(null)
  const [dragged, setDragged] = useState(null)
  const [dropTarget, setDropTarget] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const { columns } = resolveDesign(template, cvData.design)
  const { personal, ...groups } = getSectionGroups(cvData, template.layout, columns)

  const isEditing = Boolean(editor)
  useEffect(() => {
    onEditingChange?.(isEditing)
    return () => onEditingChange?.(false)
  }, [isEditing, onEditingChange])

  function changeConfig(update) {
    onChange(previous => ({ ...previous, sections: update(previous.sections ?? {}) }))
  }

  function save(item, title, draft, entries) {
    onChange(previous => {
      let config = previous.sections ?? {}
      let updated = previous
      if (item.custom) {
        const custom = config.custom ?? []
        const section = { id: item.id, title, entries }
        config = { ...config, custom: item.isNew ? [...custom, section] : custom.map(value => value.id === item.id ? section : value) }
      } else {
        if (title !== item.title) config = updateSetting(config, item.id, { title })
        if (item.id === 'personal' || item.id === 'summary') updated = { ...updated, basicInformation: draft.basicInformation }
        if (item.id === 'experience') updated = { ...updated, workExperience: draft.workExperience }
        if (item.id === 'education') updated = { ...updated, education: draft.education }
        if (item.id === 'skills' || item.id === 'languages') updated = { ...updated, skills: draft.skills }
        if (standardSections[item.id].fields) config = { ...config, content: { ...config.content, [item.id]: entries } }
      }
      return { ...updated, sections: config }
    })
    setEditor(null)
    setAnnouncement(`${title} saved.`)
  }

  function remove(item) {
    const populated = sectionHasContent(cvData, item.id)
    const message = item.custom
      ? `Permanently delete “${item.title}” and its content?`
      : `Remove “${item.title}” from the CV? Its content will be kept and restored when you add it again.`
    if ((populated || item.custom) && !window.confirm(message)) return

    changeConfig(config => {
      if (!item.custom) return updateSetting(config, item.id, { removed: true })
      const settings = { ...config.settings }
      delete settings[item.id]
      return { ...config, settings, custom: config.custom.filter(section => section.id !== item.id), order: config.order?.filter(id => id !== item.id) }
    })
    setAnnouncement(item.custom ? `${item.title} deleted.` : `${item.title} removed from the document.`)
  }

  function move(group, item, target) {
    if (!target || item.id === target.id) return
    changeConfig(config => reorderGroup(config, groups, group, item.id, target.id))
    setAnnouncement(`${item.title} moved to position ${groups[group].indexOf(target) + 1}.`)
  }

  function clearDrag() {
    setDragged(null)
    setDropTarget(null)
  }

  function renderGroup(group, title) {
    return (
      <section className="cv-sections-group" aria-label={title}>
        <h4>{title}</h4>
        <ul>
          {groups[group].map((item, index) => (
            <SectionItem key={item.id} item={item} index={index} count={groups[group].length}
              onEdit={() => setEditor(item)}
              onToggle={() => changeConfig(config => updateSetting(config, item.id, { hidden: !item.hidden }))}
              onRemove={() => remove(item)}
              move={offset => move(group, item, groups[group][index + offset])}
              drag={{
                target: dropTarget,
                start: event => {
                  event.dataTransfer.setData('text/plain', item.id)
                  event.dataTransfer.effectAllowed = 'move'
                  setDragged({ item, group })
                },
                end: clearDrag,
                over: event => {
                  if (dragged?.group !== group || dragged.item.id === item.id) return
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  setDropTarget(item.id)
                },
                drop: event => {
                  if (dragged?.group !== group) return
                  event.preventDefault()
                  move(group, dragged.item, item)
                  clearDrag()
                }
              }}
            />
          ))}
        </ul>
      </section>
    )
  }

  if (editor) {
    return <EditSectionPanel key={editor.id} item={editor} cvData={cvData} validateStep={validateStep} onSave={save} onCancel={() => setEditor(null)} />
  }

  return (
    <div className="cv-sections-panel">
      <div className="cv-section-actions">
        <button type="button" className="cv-design-action" aria-expanded={showAdd} onClick={() => setShowAdd(value => !value)}>
          <Plus size={16} aria-hidden="true" /> Add Section
        </button>
        <button type="button" className="cv-design-action" onClick={() => {
          if (window.confirm('Restore the selected template’s default order and headings and show hidden or removed standard sections again? CV content and custom sections will be kept.')) {
            changeConfig(config => ({ content: config.content, custom: config.custom }))
            setAnnouncement('Template section defaults restored.')
          }
        }}>Reset Sections</button>
      </div>

      {showAdd && (
        <section className="cv-sections-group cv-section-editor" aria-label="Available sections">
          <h4>Available sections</h4>
          <div className="cv-section-actions">
            {availableSections(cvData).map(id => (
              <button type="button" className="cv-design-action" key={id} onClick={() => {
                changeConfig(config => updateSetting(config, id, { added: true, removed: false, hidden: false }))
                setShowAdd(false)
                setAnnouncement(`${standardSections[id].title} added.`)
              }}>{standardSections[id].title}</button>
            ))}
            <button type="button" className="cv-design-action" onClick={() => {
              setShowAdd(false)
              setEditor({ id: `custom-${crypto.randomUUID()}`, title: '', custom: true, isNew: true })
            }}>Custom section</button>
          </div>
        </section>
      )}

      <p>Personal Information stays at the top. {columns === 'two' && 'Move sections within their assigned column. Column placement follows the template and Design settings.'}</p>
      <ul className="cv-sections-pinned"><SectionItem item={personal} onEdit={() => setEditor(personal)} /></ul>
      {renderGroup('main', columns === 'two' ? 'Main column' : 'Document sections')}
      {columns === 'two' && renderGroup('sidebar', 'Sidebar column')}
      <p role="status">{announcement}</p>
    </div>
  )
}
