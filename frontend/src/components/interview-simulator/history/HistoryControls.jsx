const selections = [
  ['type', 'Interview type', [
    ['all', 'All Types'], ['technical', 'Technical'], ['behavioral', 'Behavioral'], ['general', 'General'], ['custom', 'Custom']
  ]],
  ['status', 'Interview status', [
    ['all', 'All Statuses'], ...['Completed', 'In Progress', 'Paused', 'Ended Early', 'Time Expired'].map(value => [value, value])
  ]],
  ['period', 'Date range', [
    ['all', 'All Time'], ['1', 'Today'], ['7', 'Last 7 Days'], ['30', 'Last 30 Days'], ['90', 'Last 90 Days'], ['custom', 'Custom Date Range']
  ]],
  ['evaluation', 'Evaluation status', [
    ['all', 'All Evaluations'], ...['Evaluated', 'Pending', 'Unavailable', 'Failed'].map(value => [value, value])
  ]],
  ['sort', 'Sort by', [
    ['newest', 'Newest First'], ['oldest', 'Oldest First'], ['highest', 'Highest Score'],
    ['lowest', 'Lowest Score'], ['longest', 'Longest Duration'], ['shortest', 'Shortest Duration']
  ]]
]

export default function HistoryControls({ filters, range, count, onChange, onClear }) {
  return (
    <section className="interview-history-controls" aria-label="Search and filter interview history">
      <div className="interview-history-filter-grid">
        <label>
          <span>Search interviews</span>
          <input type="search" value={filters.search} placeholder="Search interviews..."
            onChange={event => onChange('search', event.target.value)} />
        </label>
        {selections.map(([name, label, options]) => (
          <label key={name}>
            <span>{label}</span>
            <select name={name} value={filters[name]} onChange={event => onChange(name, event.target.value)}>
              {options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
            </select>
          </label>
        ))}
        {filters.period === 'custom' && (
          <>
            <label>
              <span>From date</span>
              <input type="date" name="from" value={filters.from} aria-invalid={range.invalid || undefined}
                aria-describedby={range.invalid ? 'interview-history-date-error' : undefined}
                onChange={event => onChange('from', event.target.value)} />
            </label>
            <label>
              <span>To date</span>
              <input type="date" name="to" value={filters.to} aria-invalid={range.invalid || undefined}
                aria-describedby={range.invalid ? 'interview-history-date-error' : undefined}
                onChange={event => onChange('to', event.target.value)} />
            </label>
          </>
        )}
      </div>
      {range.invalid && <p id="interview-history-date-error" role="alert">Enter a valid date range with the start on or before the end.</p>}
      <div className="interview-history-toolbar">
        <p role="status">{count} matching {count === 1 ? 'interview' : 'interviews'}</p>
        <button type="button" className="interview-secondary" onClick={onClear}>Clear Filters</button>
      </div>
    </section>
  )
}
