import { ArrowRight, ClipboardList } from 'lucide-react'
import { Link } from 'react-router-dom'
import HistoryRecord from './history/HistoryRecord'
import { StartInterviewLink } from './InterviewHero'

export default function RecentInterviews({ records, history }) {
  return (
    <section className="interview-section" aria-labelledby="recent-interviews">
      <div className="interview-section-header">
        <h2 id="recent-interviews">Recent Interviews</h2>
        <Link to="/interview-simulator/history" className="interview-view-all">
          View all <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>
      {history.loading ? <p role="status">Loading recent interviews…</p>
        : history.error ? (
          <div className="interview-empty">
            <p role="alert">Recent interviews could not be loaded.</p>
            <button type="button" className="interview-secondary" onClick={history.retry}>Retry</button>
          </div>
        ) : records.length ? (
          <ul className="interview-history-list" aria-label="Recent interview records">
            {records.map(record => <HistoryRecord key={record.session.id} record={record} />)}
          </ul>
        ) : (
          <div className="interview-empty">
            <span className="interview-empty-icon"><ClipboardList size={26} aria-hidden="true" /></span>
            <h3>No interviews yet</h3>
            <p>Your completed interviews will appear here.</p>
            <StartInterviewLink />
          </div>
        )}
    </section>
  )
}
