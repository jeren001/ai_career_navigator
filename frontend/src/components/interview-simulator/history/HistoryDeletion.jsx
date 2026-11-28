import { useRef, useState } from 'react'
import { interviewSessionRepository } from '../../../services/interviewSessionRepository'
import InterviewConfirmation from '../InterviewConfirmation'

export default function HistoryDeletion({ selection, onCancel, onDeleted }) {
  const [includeUnfinished, setIncludeUnfinished] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pending = useRef(false)
  const bulk = selection.kind === 'all'
  const sessions = selection.sessions
  const protectedCount = sessions.filter(session => session.status !== 'completed').length
  const affected = includeUnfinished ? sessions : sessions.filter(session => session.status === 'completed')

  async function remove() {
    if (pending.current || !affected.length) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const ids = bulk
        ? await interviewSessionRepository.removeAll({ includeUnfinished, expectedIds: affected.map(session => session.id) })
        : await interviewSessionRepository.remove(sessions[0].id, { includeUnfinished })
      onDeleted(ids)
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : ''
      setError(/no longer available|Confirm deletion|history changed/.test(message)
        ? message : 'The interview records could not be deleted. Check that browser storage is available and retry.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  return (
    <InterviewConfirmation title={bulk ? 'Delete all interview history?' : 'Delete interview?'}
      confirmLabel={bulk ? 'Delete All History' : 'Delete Interview'}
      confirmDisabled={!affected.length} busy={busy} error={error} onCancel={onCancel} onConfirm={remove}
      details={(bulk || protectedCount > 0) && (
        <div className="interview-history-deletion-options">
          {bulk && <p role="status">{affected.length} of {sessions.length} {sessions.length === 1 ? 'record' : 'records'} will be deleted, including records hidden by filters.</p>}
          {protectedCount > 0 && (
            <label>
              <input type="checkbox" checked={includeUnfinished} disabled={busy}
                onChange={event => setIncludeUnfinished(event.target.checked)} />
              {bulk ? `Also delete ${protectedCount} active or paused ${protectedCount === 1 ? 'interview' : 'interviews'}`
                : 'Delete this unfinished interview and its saved progress'}
            </label>
          )}
        </div>
      )}>
      {bulk ? 'Are you sure you want to delete your entire interview history? This action cannot be undone.'
        : 'Are you sure you want to delete this interview? This action cannot be undone.'}
    </InterviewConfirmation>
  )
}
