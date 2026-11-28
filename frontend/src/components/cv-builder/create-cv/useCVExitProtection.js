import { useLocale } from '../../../lib/locale.js'
import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export default function useCVExitProtection(dirty, saving) {
  const { t } = useLocale()
  const discardMessage = t('Your unsaved changes will be lost. Do you want to leave?', '未保存的更改将丢失。确定离开吗？')
  const blocker = useBlocker(dirty || saving)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (!saving && window.confirm(discardMessage)) blocker.proceed()
    else blocker.reset()
  }, [blocker, saving, discardMessage])

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
