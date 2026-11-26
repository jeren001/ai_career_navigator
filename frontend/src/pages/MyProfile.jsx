// ==========================================
// PROJECT: AI CAREER
// PAGE: My Profile
// PURPOSE: Manage user profile and personal data
// ==========================================

// Import React tools
import { useState } from 'react'

// Import navigation tools

// Import icons

// Import global user context
import { useUser } from '../context/user.js'

import { apiErrorText, useLocale } from '../lib/locale.js'

// Import shared dashboard layout
import DashboardLayout from '../components/dashboard/DashboardLayout'

// Import profile components
import ProfileOverview from '../components/profile/ProfileOverview'
import PersonalInformation from '../components/profile/PersonalInformation'

// Import page styles
import '../styles/my-profile.css'


// Import reusable username utilities
import {
  validateUsername,
  normalizeUsername
} from '../utils/usernameUtils'



// 01. MY PROFILE PAGE

function MyProfile() {

  // Global user profile data

  const {
    profile,
    updateProfile,
    updateProfilePhoto
  } = useUser()


  const { t } = useLocale()
  const [changes, setChanges] = useState({})
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [saveError, setSaveError] = useState(null)
  const draftProfile = { ...profile, ...changes }

  function handleEdit() {
    setIsEditing(true)
    setMessage('')
    setSaveError(null)
  }

  function handleChange(field, value) {
    setChanges((previous) => ({
      ...previous,
      [field]: field === 'username' ? normalizeUsername(value) : value
    }))
    setSaveError(null)
  }

  async function handleSave() {
    if (!isEditing || saving || (draftProfile.username && !validateUsername(draftProfile.username))) return
    setSaving(true)
    setSaveError(null)
    try {
      await updateProfile(changes)
      setChanges({})
      setIsEditing(false)
      setMessage(t('Profile updated successfully!', '资料更新成功！'))
    } catch (error) {
      setSaveError(error)
    } finally {
      setSaving(false)
    }
  }

  function handleCancel() {
    setChanges({})
    setIsEditing(false)
    setSaveError(null)
  }

  // 07. CALCULATE PROFILE COMPLETENESS

  const completionFields = [
    'firstName',
    'lastName',
    'username',
    'email',
    'dateOfBirth',
    'country',
    'city',
    'currentStatus',
    'careerGoal',
    'aboutMe'
  ]

  const completedFields = completionFields.filter(
    field => String(profile[field] ?? '').trim() !== ''
  ).length

  const percentage = Math.round(
    (completedFields / completionFields.length) * 100
  )


  // 08. PAGE INTERFACE

  return (

    <DashboardLayout>

      <section className="my-profile-page">

        {/* Page heading */}

        <div className="my-profile-heading">

          <h1>{t('My Profile', '我的资料')}</h1>

          <p>{t('Manage your personal information and career goals.', '管理你的个人信息与职业目标。')}</p>

          <p>{t('Personalize your profile and shape your career journey.', '完善个人资料，规划你的职业发展。')}</p>

        </div>


        {/* Profile overview */}

        <div className="my-profile-overview">

          <ProfileOverview
            firstName={profile.firstName}
            lastName={profile.lastName}
            username={profile.username}
            headline={
              profile.currentStatus ||
              t('Career Explorer', '职业探索者')
            }
            profilePhoto={profile.profilePhoto}
            percentage={percentage}
            onEdit={isEditing ? undefined : handleEdit}
            onPhotoChange={updateProfilePhoto}
          />

        </div>


        {/* Success message */}

        {message && (

          <div
            className="profile-success-message"
            role="status"
          >

            {message}

          </div>

        )}


        {saveError && <p role="alert">{apiErrorText(saveError, t)}</p>}

        {/* Personal information */}

        <div className="my-profile-information">

          <PersonalInformation
            profile={isEditing ? draftProfile : profile}
            isEditing={isEditing && !saving}
            onChange={handleChange}
            onSave={handleSave}
          />

          {isEditing && (

            <button
              type="button"
              className="profile-cancel-button"
              onClick={handleCancel}
              disabled={saving}
            >

              {t('Cancel', '取消')}

            </button>

          )}

        </div>


        </section>

    </DashboardLayout>

  )

}

export default MyProfile
