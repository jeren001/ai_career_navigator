export default function SetupOptions({ name, title, value, options, error, onChange }) {
  return (
    <fieldset className="interview-setup-options">
      <legend>{title}</legend>
      <div className="interview-setup-option-grid">
        {options.map(([option, label]) => (
          <label key={label} className="interview-setup-option">
            <input type="radio" name={name} checked={value === option} required
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? `${name}-error` : undefined}
              onChange={() => onChange(name, option)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {error && <p className="interview-setup-error" id={`${name}-error`}>{error}</p>}
    </fieldset>
  )
}
