import { useState } from 'react'
import { Link } from 'react-router-dom'
import { compareInterviews } from '../../../services/interviewProgressModel'
import { formatInterviewDuration } from '../../../services/interviewResultsModel'
import { interviewTypeLabels } from '../../../services/interviewSessionModel'
import { difficultyOptions, experienceOptions, optionLabel } from '../../../services/interviewSetupConfig'
import { interviewResultsPath } from '../../../services/interviewSessionRepository'
import ResultsFacts from '../results/ResultsFacts'
import { dateText, deltaText, numberText, scoreText } from './progressFormat'

function selectionLabel(record) {
  const { configuration } = record.session
  return [configuration.role, configuration.companyName, interviewTypeLabels[record.session.interviewType],
    dateText(record.date), optionLabel(difficultyOptions, configuration.difficulty),
    optionLabel(experienceOptions, configuration.experience), record.evaluationStatus].filter(Boolean).join(' · ')
}

function valueText(value, unit) {
  if (value === null) return 'Unavailable'
  if (unit === 'score') return scoreText(value)
  if (unit === 'time') return formatInterviewDuration(value)
  return `${numberText(value)}${unit === 'words' ? ' words' : ''}`
}

function differenceText(row) {
  if (!row.compare || row.a === null || row.b === null) return 'Unavailable'
  const difference = row.b - row.a
  if (row.unit === 'score') return deltaText(difference)
  if (Math.abs(difference) < (row.unit === 'time' ? 1000 : .05)) return 'Unchanged'
  return `${difference > 0 ? '+' : '−'}${valueText(Math.abs(difference), row.unit)}`
}

function SelectedInterview({ record, side }) {
  const { configuration } = record.session
  return (
    <div className="progress-comparison-interview">
      <h4>Interview {side}</h4>
      <ResultsFacts className="progress-facts" entries={[
        ['Job role', configuration.role],
        ...(configuration.companyName ? [['Company name', configuration.companyName]] : []),
        ['Interview type', interviewTypeLabels[record.session.interviewType]], ['Interview date', dateText(record.date)],
        ['Difficulty', optionLabel(difficultyOptions, configuration.difficulty)],
        ['Experience level', optionLabel(experienceOptions, configuration.experience)],
        ['Evaluation status', record.evaluationStatus]
      ]} />
      <Link className="interview-secondary" to={interviewResultsPath(record.session.id)}>View Interview {side} Results</Link>
    </div>
  )
}

function Feedback({ label, side, items }) {
  return (
    <div>
      <h4>Interview {side} · {label}</h4>
      {items?.length ? <ul>{items.map((item, index) => <li key={index}>{item}</li>)}</ul> : <p>Unavailable</p>}
    </div>
  )
}

export default function InterviewComparison({ records }) {
  const [first, setFirst] = useState('')
  const [second, setSecond] = useState('')
  const a = records.find(record => record.session.id === first)
  const b = records.find(record => record.session.id === second)
  const compared = a && b && a.session.id !== b.session.id ? compareInterviews(a, b) : null

  return (
    <section className="progress-panel" aria-labelledby="progress-compare">
      <h3 id="progress-compare">Compare Interviews</h3>
      {records.length < 2 ? <p>At least two completed interviews must match the filters to compare them.</p> : (
        <>
          <div className="progress-two-columns">
            {[
              ['A', a, b, setFirst], ['B', b, a, setSecond]
            ].map(([label, current, other, onChange]) => (
              <label className="progress-inline-field" key={label}>Interview {label}
                <select value={current?.session.id ?? ''} onChange={event => onChange(event.target.value)}>
                  <option value="">Select an interview</option>
                  {records.map(record => (
                    <option key={record.session.id} value={record.session.id} disabled={record.session.id === other?.session.id}>
                      {selectionLabel(record)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {!compared ? <p className="progress-note">Select two different interviews to compare their records.</p> : (
            <>
              <div className="progress-two-columns">
                <SelectedInterview record={a} side="A" /><SelectedInterview record={b} side="B" />
              </div>
              {compared.warnings.length > 0 && <p className="progress-comparison-warning" role="status">
                {compared.warnings.join(' ')} Score changes are unavailable for this comparison.
              </p>}
              <div className="progress-table-scroll" role="region" aria-label="Comparison data" tabIndex={0}><table>
                <caption className="sr-only">Interview comparison and differences</caption>
                <thead><tr><th scope="col">Metric</th><th scope="col">Interview A</th><th scope="col">Interview B</th><th scope="col">Difference (B − A)</th></tr></thead>
                <tbody>{compared.rows.map(row => {
                  const diff = differenceText(row)
                  return (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th><td>{valueText(row.a, row.unit)}</td><td>{valueText(row.b, row.unit)}</td>
                      <td className={diff.startsWith('+') ? 'progress-positive' : diff.startsWith('−') ? 'progress-negative' : undefined}>{diff}</td>
                    </tr>
                  )
                })}</tbody>
              </table></div>
              <div className="progress-two-columns progress-comparison-feedback">
                <Feedback label="Strengths" side="A" items={a.evaluation?.feedback?.strengths} />
                <Feedback label="Strengths" side="B" items={b.evaluation?.feedback?.strengths} />
                <Feedback label="Areas for improvement" side="A" items={a.evaluation?.feedback?.improvements} />
                <Feedback label="Areas for improvement" side="B" items={b.evaluation?.feedback?.improvements} />
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
