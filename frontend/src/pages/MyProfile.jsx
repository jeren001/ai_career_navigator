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
import { useUser } from '../context/UserContext'

// Import global language hook

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


  // Global language preferences

  


  // Find the currently selected language

  


  // Temporary editable data

  const [draftProfile, setDraftProfile] = useState({ ...profile })


  // Edit mode

  const [isEditing, setIsEditing] = useState(false)


  // Feedback message

  const [message, setMessage] = useState('')


  // 02. ENABLE EDIT MODE

  function handleEdit() {

    setDraftProfile({ ...profile })
    setIsEditing(true)
    setMessage('')

  }


  // 03. UPDATE PROFILE FIELDS

function handleChange(field, value) {

  // Normalize username before updating the profile
  const updatedValue =
    field === 'username'
      ? normalizeUsername(value)
      : value

  setDraftProfile(previous => ({
    ...previous,
    [field]: updatedValue
  }))

  setMessage('')

}

  // 04. SAVE PROFILE CHANGES

function handleSave() {

  // Prevent saving an invalid username
  if (!isEditing || !validateUsername(draftProfile.username)) {
    return
  }

  // Update global user profile
  updateProfile({ ...draftProfile })

  // Exit edit mode
  setIsEditing(false)

  // Display success feedback
  setMessage('Profile updated successfully!')

}


  // 05. CANCEL PROFILE EDITING

  function handleCancel() {

    setDraftProfile({ ...profile })
    setIsEditing(false)
    setMessage('')

  }


  // 06. HANDLE PROFILE PHOTO CHANGES

  function handlePhotoChange(photo) {

    // Update global profile photo

    updateProfilePhoto(photo)


    // Synchronize editable profile data

    setDraftProfile(previous => ({
      ...previous,
      profilePhoto: photo
    }))

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

          <h1>{"My Profile"}</h1>

          <p>{"Manage your personal information and career goals."}</p>

          <p>{"Personalize your profile and shape your career journey."}</p>

        </div>


        {/* Profile overview */}

        <div className="my-profile-overview">

          <ProfileOverview
            firstName={profile.firstName}
            lastName={profile.lastName}
            username={profile.username}
            headline={
              profile.currentStatus ||
              "Career Explorer"
            }
            profilePhoto={profile.profilePhoto}
            percentage={percentage}
            onEdit={isEditing ? undefined : handleEdit}
            onPhotoChange={handlePhotoChange}
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


        {/* Personal information */}

        <div className="my-profile-information">

          <PersonalInformation
            profile={isEditing ? draftProfile : profile}
            isEditing={isEditing}
            onChange={handleChange}
            onSave={handleSave}
          />

          {isEditing && (

            <button
              type="button"
              className="profile-cancel-button"
              onClick={handleCancel}
            >

              {"Cancel"}

            </button>

          )}

        </div>


        </section>

    </DashboardLayout>

  )

}

export default MyProfile