import { useEffect, useState } from 'react'
import { sessionTime } from '../../../services/interviewSessionModel'

export default function useSessionClock(session) {
  const [now, setNow] = useState(Date.now)
  const running = session.runningSince !== null

  useEffect(() => {
    if (!running) return
    const tick = () => setNow(Date.now())
    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [running])

  return sessionTime(session, now)
}
