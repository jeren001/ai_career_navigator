// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Profile Overview
// PURPOSE: Display user identity and progress
// ==========================================

// Import icons
import { Pencil } from 'lucide-react'

// Import reusable profile components
import ProfileCompleteness from './ProfileCompleteness'
import ProfileAvatar from './ProfileAvatar'


    function ProfileOverview({
    firstName = '',
    lastName = '',
    username = '',
    headline = 'Career Explorer',
    profilePhoto = null,
    percentage = 0,
    onEdit,
    onPhotoChange
    }) {

  return (
    <div className="profile-overview-card">

      {/* 01. USER IDENTITY */}

      <div className="profile-overview-header">

        {/* Profile photo */}

        <ProfileAvatar
          photo={profilePhoto}
          onPhotoChange={onPhotoChange}
        />


        {/* User information */}

        <div className="profile-overview-details">

          <h2>
                {[firstName, lastName].filter(Boolean).join(' ') || 'Your Name'}
                </h2>

          {username && (
            <span className="profile-overview-username">
                @{username}
            </span>
            )}

          <p>{headline}</p>

        </div>


        {/* Edit profile button */}

        <button
          type="button"
          className="profile-overview-edit"
          aria-label="Edit profile"
          onClick={onEdit}
          disabled={!onEdit}
        >
          <Pencil size={19} />
        </button>

      </div>


      {/* 02. PROFILE COMPLETENESS */}

      <ProfileCompleteness
        percentage={percentage}
      />

    </div>
  )
}

export default ProfileOverview