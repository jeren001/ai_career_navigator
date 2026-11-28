import { useEffect, useRef, useState } from 'react'
import { interviewSessionRepository } from '../../../services/interviewSessionRepository'
import useInterviewWorkspaceEpoch from '../useInterviewWorkspaceEpoch'

const emptyRecords = []

export default function useInterviewRecords() {
  const epoch = useInterviewWorkspaceEpoch()
  const [result, setResult] = useState(null)
  const [attempt, setAttempt] = useState(0)
  const version = useRef(0)

  useEffect(() => {
    let current = true
    let pending = false

    async function load() {
      if (pending) return
      const requestVersion = version.current
      pending = true
      try {
        const records = await interviewSessionRepository.list()
        if (current && requestVersion === version.current) setResult({ epoch, attempt, records, loadedAt: Date.now() })
      } catch {
        if (current && requestVersion === version.current) setResult({ epoch, attempt, error: true })
      } finally {
        pending = false
      }
    }

    load()
    window.addEventListener('focus', load)
    return () => {
      current = false
      window.removeEventListener('focus', load)
    }
  }, [attempt, epoch])

  const visible = result?.epoch === epoch ? result : null

  return {
    epoch,
    records: visible?.records ?? emptyRecords,
    loadedAt: visible?.loadedAt ?? 0,
    loading: !visible || (visible.error && visible.attempt !== attempt),
    error: Boolean(visible?.error && visible.attempt === attempt),
    retry: () => setAttempt(previous => previous + 1),
    removeFromList: ids => {
      version.current++
      const removed = new Set(ids)
      setResult(previous => previous?.records && previous.epoch === epoch
        ? { ...previous, records: previous.records.filter(record => !removed.has(record.session.id)) }
        : previous)
    }
  }
}
