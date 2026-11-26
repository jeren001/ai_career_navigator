import { useEffect, useState } from 'react'
import { UserContext } from './user.js'
import { readProfileUsername, storeProfileUsername } from '../lib/storage.js'
import { useSession } from '../session/session.js'

export function UserProvider({ children }) {
  const { user } = useSession()
  return <AccountProfileProvider key={user.id} user={user}>{children}</AccountProfileProvider>
}

function AccountProfileProvider({ children, user }) {
  const { request } = useSession()
  const [accountProfile, setAccountProfile] = useState(null)
  const [profileEdits, setProfileEdits] = useState(() => ({
    username: user.is_guest ? '' : readProfileUsername(user.id),
    dateOfBirth: '',
    city: '',
    currentStatus: '',
    aboutMe: '',
    profilePhoto: null
  }))

  useEffect(() => {
    if (user.is_guest) return

    const controller = new AbortController()
    request('/api/profile', { signal: controller.signal })
      .then(({ profile }) => {
        if (!controller.signal.aborted) setAccountProfile((current) => current ?? profile)
      })
      .catch(() => {
        // Use the account fields returned by authentication while profile data is unavailable.
      })
    return () => controller.abort()
  }, [request, user.id, user.is_guest])

  const account = accountProfile ?? user
  const [firstName = '', ...lastName] = (account.display_name ?? '').trim().split(/\s+/)
  const profile = {
    firstName,
    lastName: lastName.join(' '),
    email: account.email ?? '',
    country: account.country ?? '',
    careerGoal: account.career_goals ?? '',
    ...profileEdits
  }

  async function updateProfile(changes) {
    const edits = { ...changes }
    const body = {}
    if ('firstName' in edits || 'lastName' in edits) {
      edits.firstName = (edits.firstName ?? profile.firstName).trim()
      edits.lastName = (edits.lastName ?? profile.lastName).trim()
      body.display_name = [edits.firstName, edits.lastName].filter(Boolean).join(' ')
    }
    if ('country' in edits) body.country = edits.country
    if ('careerGoal' in edits) body.career_goals = edits.careerGoal

    if (Object.keys(body).length) {
      const { profile: savedProfile } = await request('/api/profile', { method: 'PATCH', body })
      setAccountProfile(savedProfile)
    }
    delete edits.country
    delete edits.careerGoal
    if ('username' in edits) storeProfileUsername(user.id, edits.username)
    setProfileEdits((previous) => ({ ...previous, ...edits }))
  }

  function updateProfilePhoto(photo) {
    setProfileEdits((previous) => ({ ...previous, profilePhoto: photo }))
  }

  return (
    <UserContext.Provider value={{ profile, updateProfile, updateProfilePhoto, updateProfileEdits: setProfileEdits }}>
      {children}
    </UserContext.Provider>
  )
}
