import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { restoreInterviewSetup } from '../../../services/interviewSetupConfigs'

const insights = [
  'Overall Performance Analysis', 'Most Improved Skills', 'Strongest Skills',
  'Areas for Improvement', 'Recurring Difficulties', 'Recommended Practice Topics'
]
const planActions = ['Generate Practice Plan', 'View Practice Plan', 'Start Recommended Practice', 'Update Practice Plan']

export default function ProgressCoaching({ records }) {
  const [skillId, setSkillId] = useState('')
  const navigate = useNavigate()
  const latest = records[records.length - 1]
  const practice = records.findLast(record => record.evaluation?.practiceFocus?.length)
  const focus = practice?.evaluation.practiceFocus
  const options = focus?.flatMap(({ type, entries }) => entries.map(entry => ({ type, entry, id: JSON.stringify([type, entry]) }))) ?? []
  const selected = options.find(option => option.id === skillId)

  function start(record, practiceFocus) {
    navigate(restoreInterviewSetup(record.session.configuration, practiceFocus))
  }

  return (
    <>
      <div className="progress-two-columns">
        <section className="progress-panel" aria-labelledby="progress-insights">
          <h3 id="progress-insights">AI Performance Insights</h3>
          <p>Personalized insights are unavailable until the AI service is connected.</p>
          <dl className="progress-insights">
            {insights.map(title => <div key={title}><dt>{title}</dt><dd>Unavailable</dd></div>)}
          </dl>
        </section>
        <section className="progress-panel" aria-labelledby="progress-plan">
          <h3 id="progress-plan">Personalized Practice Plan</h3>
          <p id="progress-plan-unavailable">Practice plans are unavailable until the AI service is connected.</p>
          <div className="progress-actions">
            {planActions.map(label => <button key={label} type="button" className="interview-secondary"
              disabled aria-describedby="progress-plan-unavailable">{label}</button>)}
          </div>
        </section>
      </div>
      <section className="progress-panel" aria-labelledby="progress-recommendations">
        <h3 id="progress-recommendations">Practice Recommendations</h3>
        {!focus && <p id="progress-focus-unavailable">Skill-focused practice requires validated evaluation recommendations.</p>}
        <p className="progress-note" id="progress-recommended-unavailable">Recommended interviews require a personalized practice plan.</p>
        {options.length > 0 && (
          <label className="progress-inline-field">Recommended skill or topic
            <select value={selected?.id ?? ''} onChange={event => setSkillId(event.target.value)}>
              <option value="">Choose a skill or topic</option>
              {options.map(option => <option key={option.id} value={option.id}>{option.entry} · {option.type}</option>)}
            </select>
          </label>
        )}
        <div className="progress-actions">
          <button type="button" className="interview-secondary" disabled={!focus}
            aria-describedby={!focus ? 'progress-focus-unavailable' : undefined}
            onClick={() => start(practice, focus)}>Practice Weak Areas</button>
          <button type="button" className="interview-secondary" disabled={!selected}
            aria-describedby={!focus ? 'progress-focus-unavailable' : undefined}
            onClick={() => start(practice, [{ type: selected.type, entries: [selected.entry] }])}>Improve Specific Skills</button>
          <button type="button" className="interview-secondary" disabled aria-describedby="progress-recommended-unavailable">Start Recommended Interview</button>
          <button type="button" className="interview-secondary" disabled={!latest}
            onClick={() => start(latest)}>Retake Previous Interview</button>
        </div>
      </section>
    </>
  )
}
