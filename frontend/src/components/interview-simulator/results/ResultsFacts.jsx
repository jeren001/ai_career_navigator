export default function ResultsFacts({ entries, className = 'interview-results-facts' }) {
  return (
    <dl className={className}>
      {entries.map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  )
}
