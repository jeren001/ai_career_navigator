import { useId } from 'react'
import { Plus, Trash2 } from 'lucide-react'

export default function SectionFields({ fields, entries, onChange }) {
  const id = useId()

  function updateEntry(id, field, value) {
    onChange(entries.map(entry => entry.id === id ? { ...entry, [field]: value } : entry))
  }

  return (
    <div className="cv-section-fields">
      {entries.map((entry, index) => (
        <fieldset className="cv-section-entry-card" key={entry.id} aria-labelledby={`${id}-${entry.id}`}>
          <div className="cv-experience-header">
            <h5 id={`${id}-${entry.id}`}>Entry {index + 1}</h5>
            <button type="button" className="cv-remove-button" aria-label={`Remove entry ${index + 1}`} title="Remove entry"
              onClick={() => onChange(entries.filter(item => item.id !== entry.id))}>
              <Trash2 size={18} aria-hidden="true" />
            </button>
          </div>
          {fields.map(({ key, label, multiline }) => {
            const Control = multiline ? 'textarea' : 'input'
            return (
              <label className="cv-gallery-field" key={key}>
                <span>{label}</span>
                <Control dir="auto" value={entry[key] ?? ''} onChange={event => updateEntry(entry.id, key, event.target.value)} />
              </label>
            )
          })}
        </fieldset>
      ))}
      <button type="button" className="cv-add-button" onClick={() => onChange([...entries, { id: crypto.randomUUID() }])}>
        <Plus size={16} aria-hidden="true" /> Add entry
      </button>
    </div>
  )
}
