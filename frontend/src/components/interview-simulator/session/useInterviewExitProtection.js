import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export default function useInterviewExitProtection(unfinished, protectUnload) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => unfinished &&
    (currentLocation.pathname !== nextLocation.pathname || currentLocation.search !== nextLocation.search))

  useEffect(() => {
    if (!protectUnload) return
    function preventUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', preventUnload)
    return () => window.removeEventListener('beforeunload', preventUnload)
  }, [protectUnload])

  return blocker
}
