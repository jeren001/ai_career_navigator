import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'
import InterviewHeader from '../components/interview-simulator/InterviewHeader'
import HistoryControls from '../components/interview-simulator/history/HistoryControls'
import HistoryDeletion from '../components/interview-simulator/history/HistoryDeletion'
import HistoryRecord from '../components/interview-simulator/history/HistoryRecord'
import useInterviewRecords from '../components/interview-simulator/history/useInterviewRecords'
import InterviewReport from '../components/interview-simulator/results/InterviewReport'
import ResultsFacts from '../components/interview-simulator/results/ResultsFacts'
import { buildHistoryRecords, filterHistory, historyDateRange, historyDefaults, historyStatistics } from '../services/interviewHistoryModel'
import { buildInterviewResults } from '../services/interviewResultsModel'
import { restoreInterviewSetup } from '../services/interviewSetupConfigs'
import '../styles/interview-simulator.css'
import '../styles/interview-history.css'
import '../styles/interview-results.css'

const home = '/interview-simulator'

function HistoryContent({ history }) {
  const [filters, setFilters] = useState(historyDefaults)
  const [selection, setSelection] = useState(null)
  const [notice, setNotice] = useState(null)
  const [report, setReport] = useState(null)
  const printRequest = useRef(null)
  const title = useRef(null)
  const navigate = useNavigate()
  const records = buildHistoryRecords(history.records)
  const range = historyDateRange(filters)
  const visible = filterHistory(records, filters, range)
  const reportRecord = report && records.find(record => record.session.id === report.id)

  useEffect(() => {
    window.scrollTo(0, 0)
    title.current.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (!reportRecord || printRequest.current === report) return
    printRequest.current = report
    window.print()
  }, [report, reportRecord])

  useEffect(() => {
    if (notice) title.current?.focus()
  }, [notice])

  function deleted(ids) {
    history.removeFromList(ids)
    setSelection(null)
    setNotice({ message: `${ids.length} ${ids.length === 1 ? 'interview' : 'interviews'} deleted.` })
  }

  return (
    <>
      <main className="interview-history-page">
        <nav className="interview-history-breadcrumb" aria-label="Breadcrumb">
          <Link to={home}><ArrowLeft size={17} aria-hidden="true" /> Back to Interview Simulator</Link>
          <span aria-current="page">Interview History</span>
        </nav>
        <div className="interview-history-toolbar">
          <h2 ref={title} tabIndex={-1}>Interview History</h2>
          <div className="interview-history-actions">
            <Link className="interview-secondary" to="/interview-simulator/progress">Progress &amp; Performance</Link>
            {records.length > 0 && (
              <button type="button" className="interview-secondary interview-history-delete"
                onClick={() => setSelection({ kind: 'all', sessions: records.map(record => record.session) })}>Delete All History</button>
            )}
          </div>
        </div>
        <p className="sr-only" role="status">{notice?.message}</p>
        {history.loading ? <p role="status">Loading interview history…</p>
          : history.error ? (
            <div className="interview-history-controls">
              <p role="alert">Interview history could not be loaded. Check that browser storage is available and retry.</p>
              <button type="button" className="interview-secondary" onClick={history.retry}>Retry</button>
            </div>
          ) : (
            <>
              <ResultsFacts entries={historyStatistics(records)} className="interview-history-stats" />
              {records.length ? (
                <>
                  <HistoryControls filters={filters} range={range} count={visible.length}
                    onChange={(field, value) => setFilters(previous => ({ ...previous, [field]: value }))}
                    onClear={() => setFilters(historyDefaults)} />
                  {visible.length ? (
                    <ul className="interview-history-list" aria-label="Interview records">
                      {visible.map(record => (
                        <HistoryRecord key={record.session.id} record={record}
                          onRetake={session => navigate(restoreInterviewSetup(session.configuration))}
                          onReport={({ session }) => setReport({ id: session.id })}
                          onDelete={session => setSelection({ kind: 'one', sessions: [session] })} />
                      ))}
                    </ul>
                  ) : (
                    <div className="interview-history-controls">
                      <h3>{filters.search.trim() ? 'No matching search results' : 'No interviews match these filters'}</h3>
                      <p>Change your search or filters to see other interviews.</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="interview-empty">
                  <span className="interview-empty-icon"><ClipboardList size={26} aria-hidden="true" /></span>
                  <h3>No interviews yet</h3>
                  <p>Start your first interview and track your progress over time.</p>
                  <Link className="interview-primary" to={home}>Start Interview</Link>
                </div>
              )}
            </>
          )}
        {selection && <HistoryDeletion selection={selection} onCancel={() => setSelection(null)} onDeleted={deleted} />}
      </main>
      {reportRecord && <InterviewReport results={buildInterviewResults(reportRecord.session)}
        configuration={reportRecord.session.configuration} evaluation={reportRecord.evaluation} />}
    </>
  )
}

export default function InterviewHistory() {
  const history = useInterviewRecords()
  return (
    <div className="interview-simulator interview-report-page">
      <InterviewHeader />
      <HistoryContent key={history.epoch} history={history} />
    </div>
  )
}
