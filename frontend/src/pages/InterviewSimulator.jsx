import { Link } from 'react-router-dom'
import useInterviewRecords from '../components/interview-simulator/history/useInterviewRecords'
import InterviewHeader from '../components/interview-simulator/InterviewHeader'
import InterviewHero from '../components/interview-simulator/InterviewHero'
import InterviewTypes from '../components/interview-simulator/InterviewTypes'
import RecentInterviews from '../components/interview-simulator/RecentInterviews'
import { buildHistoryRecords, filterHistory, historyDateRange, historyDefaults } from '../services/interviewHistoryModel'
import { interviewSessionPath } from '../services/interviewSessionRepository'
import '../styles/interview-simulator.css'
import '../styles/interview-history.css'

export default function InterviewSimulator() {
  const history = useInterviewRecords()
  const records = buildHistoryRecords(history.records)
  const recent = filterHistory(records, historyDefaults, historyDateRange(historyDefaults)).slice(0, 5)
  const unfinished = history.records.find(({ session }) => session.status !== 'completed')?.session

  return (
    <div className="interview-simulator">
      <InterviewHeader />
      <main className="interview-main">
        <div className="interview-progress-navigation">
          <Link className="interview-secondary" to="/interview-simulator/progress">Progress &amp; Performance</Link>
        </div>
        <InterviewHero />
        {unfinished && (
          <section className="interview-resume" aria-label="Unfinished interview">
            <p>Unfinished interview <strong>{unfinished.configuration.role}</strong></p>
            <Link className="interview-secondary" to={interviewSessionPath(unfinished.id)}>Resume Interview</Link>
          </section>
        )}
        <InterviewTypes />
        <RecentInterviews records={recent} history={history} />
      </main>
    </div>
  )
}
