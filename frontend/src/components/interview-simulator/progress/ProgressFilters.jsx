import { interviewTypeLabels } from '../../../services/interviewSessionModel'
import { difficultyOptions } from '../../../services/interviewSetupConfig'

const periods = [
  ['7', 'Last 7 Days'], ['30', 'Last 30 Days'], ['90', 'Last 90 Days'],
  ['6-months', 'Last 6 Months'], ['year', 'Last Year'], ['all', 'All Time'], ['custom', 'Custom Date Range']
]

export default function ProgressFilters({ filters, roles, range, count, onChange, onClear }) {
  const controls = [
    ['period', 'Time period', periods],
    ['type', 'Interview type', [['all', 'All Types'], ...Object.entries(interviewTypeLabels)]],
    ['role', 'Job role', [['', 'All Roles'], ...roles]],
    ['difficulty', 'Difficulty', [['all', 'All Levels'], ...difficultyOptions]]
  ]
  return (
    <section className="progress-panel" aria-label="Performance filters">
      <div className="progress-filter-grid">
        {controls.map(([field, label, options]) => (
          <label key={field}>
            {label}
            <select name={field} value={filters[field]} onChange={event => onChange(field, event.target.value)}>
              {options.map(([value, option]) => <option key={value} value={value}>{option}</option>)}
            </select>
          </label>
        ))}
        {filters.period === 'custom' && [['from', 'From date'], ['to', 'To date']].map(([field, label]) => (
          <label key={field}>
            {label}
            <input type="date" name={field} value={filters[field]} aria-invalid={range.invalid || undefined}
              aria-describedby={range.invalid ? 'progress-date-error' : undefined}
              onChange={event => onChange(field, event.target.value)} />
          </label>
        ))}
      </div>
      {range.invalid && <p id="progress-date-error" role="alert">Enter a valid date range with the start on or before the end.</p>}
      <div className="progress-toolbar">
        <p role="status">{count} matching {count === 1 ? 'interview' : 'interviews'}</p>
        <button className="interview-secondary" type="button" onClick={onClear}>Clear Filters</button>
      </div>
    </section>
  )
}
