// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Profile Overview
// PURPOSE: Display user identity and progress
// ==========================================

// Import icons
import { useLocale } from '../../lib/locale.js'
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
    hasPhoto,
    percentage = 0,
    onEdit,
    onPhotoChange
    }) {

  const { t } = useLocale()
  return (
    <div className="profile-overview-card">

      {/* 01. USER IDENTITY */}

      <div className="profile-overview-header">

        {/* Profile photo */}

        <ProfileAvatar
          photo={profilePhoto}
          hasPhoto={hasPhoto}
          onPhotoChange={onPhotoChange}
        />


        {/* User information */}

        <div className="profile-overview-details">

          <h2>
                {[firstName, lastName].filter(Boolean).join(' ') || t('Your Name', '你的姓名')}
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
          aria-label={t('Edit profile', '编辑资料')}
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