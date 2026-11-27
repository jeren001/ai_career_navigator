import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

const discardMessage = 'Your unsaved changes will be lost. Do you want to leave?'

export default function useCVExitProtection(dirty, saving) {
  const blocker = useBlocker(dirty || saving)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (!saving && window.confirm(discardMessage)) blocker.proceed()
    else blocker.reset()
  }, [blocker, saving])

  useEffect(() => {
    if (!dirty && !saving) return
    function handleUnload(event) {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [dirty, saving])

  return () => !saving && (!dirty || window.confirm(discardMessage))
}
