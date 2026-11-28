import { useEffect, useState } from 'react'
import { interviewWorkspaceKey } from '../../services/interviewSessionDatabase'

export default function useInterviewWorkspaceEpoch() {
  const [epoch, setEpoch] = useState(0)

  useEffect(() => {
    function workspaceChanged(event) {
      if (event.key === null || event.key === interviewWorkspaceKey) {
        setEpoch(value => value + 1)
      }
    }
    window.addEventListener('storage', workspaceChanged)
    return () => window.removeEventListener('storage', workspaceChanged)
  }, [])

  return epoch
}
