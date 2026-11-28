import {
  difficultyOptions, durationOptions, experienceOptions, languageOptions, optionLabel, questionOptions
} from '../../../services/interviewSetupConfig'

export default function SetupSummary({ configuration, details, starting, error, questionLabel = 'Questions' }) {
  const summary = [
    ['Job role', configuration.role || 'Not entered'],
    ...(configuration.companyName ? [['Company name', configuration.companyName]] : []),
    ['Experience', optionLabel(experienceOptions, configuration.experience)],
    ...details,
    ['Difficulty', optionLabel(difficultyOptions, configuration.difficulty)],
    [questionLabel, optionLabel(questionOptions, configuration.questionCount)],
    ['Duration', optionLabel(durationOptions, configuration.durationMinutes)],
    ['Language', optionLabel(languageOptions, configuration.language)],
    ['Format', 'Text']
  ]

  return (
    <section className="interview-setup-panel interview-setup-summary" aria-labelledby="interview-setup-summary-title">
      <h3 id="interview-setup-summary-title">Configuration summary</h3>
      <dl>
        {summary.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <button type="submit" className="interview-primary" disabled={starting}>
        {starting ? 'Starting…' : 'Start Interview'}
      </button>
      <p className="interview-setup-status" role="status">
        {error}
      </p>
    </section>
  )
}
