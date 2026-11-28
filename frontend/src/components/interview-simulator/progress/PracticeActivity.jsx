import { useState } from 'react'
import { practiceActivity } from '../../../services/interviewProgressModel'
import { formatInterviewDuration } from '../../../services/interviewResultsModel'
import ResultsFacts from '../results/ResultsFacts'
import { dateText } from './progressFormat'

const streakText = days => `${days} ${days === 1 ? 'day' : 'days'}`

export default function PracticeActivity({ records, now }) {
  const [period, setPeriod] = useState('day')
  const activity = practiceActivity(records, period, now)
  const recent = activity.buckets.slice(-16)
  const maximum = Math.max(1, ...recent.map(bucket => bucket.interviews))
  const totals = activity.buckets.reduce((result, bucket) => [
    result[0] + bucket.interviews, result[1] + bucket.timeMs, result[2] + bucket.answered, result[3] + bucket.skipped
  ], [0, 0, 0, 0])

  return (
    <section className="progress-panel" aria-labelledby="progress-activity">
      <div className="progress-toolbar">
        <h3 id="progress-activity">Practice Activity</h3>
        <label className="progress-inline-field">Group by
          <select value={period} onChange={event => setPeriod(event.target.value)}>
            <option value="day">Daily</option><option value="week">Weekly</option><option value="month">Monthly</option>
          </select>
        </label>
      </div>
      <ResultsFacts className="progress-facts" entries={[
        ['Interviews', totals[0]], ['Total practice duration', formatInterviewDuration(totals[1])],
        ['Average interview duration', totals[0] ? formatInterviewDuration(totals[1] / totals[0]) : 'Unavailable'],
        ['Questions answered', totals[2]], ['Questions skipped', totals[3]],
        ['Current practice streak', streakText(activity.current)], ['Longest practice streak', streakText(activity.longest)],
        ['Interviews completed this week', activity.completedThisWeek]
      ]} />
      {recent.length ? (
        <>
          <p className="progress-note">Interviews with submitted answers{activity.buckets.length > recent.length ? ' · latest 16 active periods' : ''}</p>
          <div className="progress-activity-bars" aria-hidden="true">
            {recent.map(bucket => (
              <div key={bucket.date} title={`${dateText(bucket.date)} · ${bucket.interviews} interviews`}>
                <span>{bucket.interviews}</span>
                <i style={{ height: `${bucket.interviews / maximum * 80}%` }} />
              </div>
            ))}
          </div>
          <div className="progress-chart-dates" aria-hidden="true">
            <span>{dateText(recent[0].date)}</span>
            {recent.length > 1 && <span>{dateText(recent[recent.length - 1].date)}</span>}
          </div>
          <details className="progress-data-details">
            <summary>View activity data</summary>
            <div className="progress-table-scroll" role="region" aria-label="Activity data" tabIndex={0}><table>
              <thead><tr><th scope="col">Period starting</th><th scope="col">Interviews</th><th scope="col">Total duration</th>
                <th scope="col">Average duration</th><th scope="col">Answered</th><th scope="col">Skipped</th></tr></thead>
              <tbody>{activity.buckets.map(bucket => (
                <tr key={bucket.date}>
                  <th scope="row">{dateText(bucket.date)}</th><td>{bucket.interviews}</td>
                  <td>{formatInterviewDuration(bucket.timeMs)}</td><td>{formatInterviewDuration(bucket.timeMs / bucket.interviews)}</td>
                  <td>{bucket.answered}</td><td>{bucket.skipped}</td>
                </tr>
              ))}</tbody>
            </table></div>
          </details>
        </>
      ) : <p>No practice with submitted answers matches these filters.</p>}
    </section>
  )
}
