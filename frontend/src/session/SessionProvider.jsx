import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, api } from '../lib/api.js'
import { readSessionToken, storeSessionToken } from '../lib/storage.js'
import { useLocale } from '../lib/locale.js'
import { SessionContext } from './session.js'

export default function SessionProvider({ children }) {
  const { setLanguage } = useLocale()
  const [initialToken] = useState(readSessionToken)
  const activeToken = useRef(initialToken)
  const revision = useRef(0)
  const [session, setSession] = useState({
    status: initialToken ? 'loading' : 'anonymous', user: null
  })

  const signOut = useCallback((accountUpdated) => {
    revision.current++
    activeToken.current = null
    storeSessionToken(null)
    setSession({ status: 'anonymous', user: null, accountUpdated: typeof accountUpdated === 'string' ? accountUpdated : null })
  }, [])

  const restoreSession = useCallback(async (signal) => {
    const token = activeToken.current
    if (!token) return
    const attempt = ++revision.current
    setSession({ status: 'loading', user: null })
    try {
      const { user } = await api('/api/auth/me', { token, signal })
      if (!user?.id) throw new ApiError(502, 'Invalid identity response')
      if (!signal?.aborted && revision.current === attempt) {
        setSession({ status: 'authenticated', user })
        if (!user.is_guest && user.preferred_language) setLanguage(user.preferred_language === 'zh-CN' ? 'CH' : 'EN')
      }
    } catch (error) {
      if (signal?.aborted || revision.current !== attempt) return
      if (error.status === 401) signOut()
      else setSession({ status: 'error', user: null, error })
    }
  }, [setLanguage, signOut])

  useEffect(() => {
    const controller = new AbortController()
    void restoreSession(controller.signal)
    return () => controller.abort()
  }, [restoreSession])

  async function authenticate(path, { body, remember = false, upgradeGuest = false } = {}) {
    const attempt = ++revision.current
    const result = await api(path, {
      method: 'POST', body, token: upgradeGuest ? activeToken.current : undefined
    })
    if (attempt !== revision.current) return false
    if (!result?.access_token || !result?.user?.id) throw new ApiError(502, 'Invalid sign-in response')
    activeToken.current = result.access_token
    storeSessionToken(result.access_token, remember)
    setSession({ status: 'authenticated', user: result.user })
    if (!result.user.is_guest && result.user.preferred_language) setLanguage(result.user.preferred_language === 'zh-CN' ? 'CH' : 'EN')
    return result.user
  }

  const request = useCallback(async (path, options = {}) => {
    const token = activeToken.current
    try {
      return await api(path, { ...options, token })
    } catch (error) {
      if (!options.signal?.aborted && error.status === 401 && error.message !== 'Current password is incorrect' && token && activeToken.current === token) signOut()
      throw error
    }
  }, [signOut])

  return (
    <SessionContext.Provider value={{ ...session, authenticate, request, restoreSession, signOut }}>
      {children}
    </SessionContext.Provider>
  )
}
