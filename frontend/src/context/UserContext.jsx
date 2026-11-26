import { useEffect, useState } from 'react'
import { UserContext } from './user.js'
import { useSession } from '../session/session.js'
import { useLocale } from '../lib/locale.js'
import { profileFromAccount, profilePatch } from '../lib/profile.js'

export function UserProvider({ children }) {
  const { user } = useSession()
  return <AccountProfileProvider key={user.id} user={user}>{children}</AccountProfileProvider>
}

function AccountProfileProvider({ children, user }) {
  const { request } = useSession()
  const { setLanguage } = useLocale()
  const [account, setAccount] = useState(user)
  const [photo, setPhoto] = useState(null)
  const [photoVersion, setPhotoVersion] = useState(0)
  const [photoError, setPhotoError] = useState(null)
  const [settings, setSettings] = useState(null)
  const [settingsError, setSettingsError] = useState(null)
  const [settingsLoading, setSettingsLoading] = useState(!user.is_guest)
  const [settingsVersion, setSettingsVersion] = useState(0)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsSaveError, setSettingsSaveError] = useState(null)
  const hasPhoto = Boolean(account.profile_photo_url)

  useEffect(() => {
    if (!hasPhoto) return
    const controller = new AbortController()
    let url
    request('/api/profile/photo', { responseType: 'blob', signal: controller.signal })
      .then((blob) => {
        if (controller.signal.aborted) return
        url = URL.createObjectURL(blob)
        setPhoto(url)
        setPhotoError(null)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setPhotoError(error)
      })
    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [hasPhoto, photoVersion, request])

  useEffect(() => {
    if (user.is_guest) return
    const controller = new AbortController()
    request('/api/settings', { signal: controller.signal })
      .then(({ settings: saved }) => {
        if (controller.signal.aborted) return
        setSettings(saved)
        setLanguage(saved.preferred_language === 'zh-CN' ? 'CH' : 'EN')
      })
      .catch((error) => {
        if (!controller.signal.aborted) setSettingsError(error)
      })
      .finally(() => {
        if (!controller.signal.aborted) setSettingsLoading(false)
      })
    return () => controller.abort()
  }, [request, setLanguage, settingsVersion, user.is_guest])

  const profile = {
    ...profileFromAccount(account), profilePhoto: hasPhoto ? photo : null, hasPhoto
  }

  async function updateProfile(changes) {
    const body = profilePatch(changes, profile)
    if (!Object.keys(body).length) return
    const { profile: saved } = await request('/api/profile', { method: 'PATCH', body })
    setAccount((current) => ({ ...saved, profile_photo_url: current.profile_photo_url }))
  }

  async function refreshProfile() {
    const { profile: saved } = await request('/api/profile')
    setAccount((current) => ({ ...saved, profile_photo_url: current.profile_photo_url }))
  }

  async function updateProfilePhoto(file) {
    if (file) {
      const saved = await request('/api/profile/photo', { method: 'PUT', rawBody: file })
      setAccount((current) => ({ ...current, profile_photo_url: saved.profile_photo_url }))
    } else {
      await request('/api/profile/photo', { method: 'DELETE' })
      setAccount((current) => ({ ...current, profile_photo_url: null }))
    }
    setPhoto(null)
    setPhotoError(null)
    setPhotoVersion((version) => version + 1)
  }

  async function updateSettings(body) {
    if (!settings || settingsLoading || settingsSaving) return
    setSettingsSaving(true)
    setSettingsSaveError(null)
    try {
      const { settings: saved } = await request('/api/settings', { method: 'PATCH', body })
      setSettings(saved)
      setLanguage(saved.preferred_language === 'zh-CN' ? 'CH' : 'EN')
    } catch (error) {
      setSettingsSaveError(error)
    } finally {
      setSettingsSaving(false)
    }
  }

  function retrySettings() {
    setSettingsError(null)
    setSettingsLoading(true)
    setSettingsVersion((version) => version + 1)
  }

  return (
    <UserContext.Provider value={{
      profile, updateProfile, refreshProfile, updateProfilePhoto, photoError,
      settings, settingsError, settingsLoading, settingsSaving, settingsSaveError, updateSettings, retrySettings
    }}>
      {children}
    </UserContext.Provider>
  )
}
