import { useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { cleanEntry, entryKey } from '../../../services/interviewSetupConfig'

function Suggestions({ label, options, query, excluded = [], onSelect }) {
  const search = entryKey(query)
  const matches = options.filter(option => {
    const key = entryKey(option)
    return key.includes(search) && !excluded.includes(key)
  }).slice(0, 5)

  if (!matches.length) return null

  return (
    <ul className="interview-setup-suggestions" aria-label={label}>
      {matches.map(option => (
        <li key={option}><button type="button" onClick={() => onSelect(option)}>{option}</button></li>
      ))}
    </ul>
  )
}

export function JobRoleField({ role, options, error, onChange }) {
  const input = useRef(null)

  return (
    <div className="interview-setup-field">
      <label htmlFor="interview-setup-role">Job role</label>
      <input ref={input} id="interview-setup-role" name="role" type="text" required value={role} maxLength={100}
        placeholder="Search or enter a job role" autoComplete="off"
        aria-invalid={error ? true : undefined} aria-describedby={error ? 'interview-setup-role-error' : undefined}
        onChange={event => onChange(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) event.preventDefault()
        }} />
      {error && <p className="interview-setup-error" id="interview-setup-role-error">{error}</p>}
      <Suggestions label="Suggested professions" options={options} query={role} excluded={[entryKey(role)]}
        onSelect={option => {
          onChange(option)
          input.current.focus()
        }} />
    </div>
  )
}

export function SetupTagsField({ field, label, entryLabel, options, entries, error, onChange }) {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const input = useRef(null)
  const id = `interview-setup-${field}`
  const selectedKeys = entries.map(entryKey)
  const duplicate = selectedKeys.includes(entryKey(query))

  function addEntry(value) {
    const entry = cleanEntry(value)
    if (!entry) return
    if (selectedKeys.includes(entryKey(entry))) {
      setMessage(`${entry} is already selected.`)
    } else {
      onChange([...entries, entry])
      setMessage(`${entry} added.`)
      setQuery('')
    }
    input.current.focus()
  }

  function removeEntry(entry) {
    onChange(entries.filter(selected => selected !== entry))
    setMessage(`${entry} removed.`)
    input.current.focus()
  }

  return (
    <div className="interview-setup-field">
      <label htmlFor={id}>{label}</label>
      <div className="interview-setup-input-row">
        <input ref={input} id={id} name={field} type="text" value={query} maxLength={80}
          placeholder={`Search or enter a ${entryLabel}`} autoComplete="off" aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-hint ${id}-error` : `${id}-hint`}
          onChange={event => {
            setQuery(event.target.value)
            setMessage('')
          }}
          onKeyDown={event => {
            if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
            event.preventDefault()
            addEntry(query)
          }} />
        <button className="interview-setup-secondary" type="button" disabled={!cleanEntry(query)} onClick={() => addEntry(query)}>
          <Plus size={16} aria-hidden="true" /> Add
        </button>
      </div>
      <p id={`${id}-hint`} className="interview-setup-hint">Select a suggestion or add your own {entryLabel}.</p>
      {error && <p className="interview-setup-error" id={`${id}-error`}>{error}</p>}
      <Suggestions label={`Suggested ${entryLabel}s`} options={options} query={query} excluded={selectedKeys} onSelect={addEntry} />
      {entries.length > 0 && (
        <ul className="interview-setup-tags" aria-label={`Selected ${entryLabel}s`}>
          {entries.map(entry => (
            <li key={entryKey(entry)}>
              <span>{entry}</span>
              <button type="button" aria-label={`Remove ${entry}`} onClick={() => removeEntry(entry)}>
                <X size={15} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className={duplicate && message ? 'interview-setup-hint' : 'sr-only'} role="status">{message}</p>
    </div>
  )
}
