// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Profile Completeness
// PURPOSE: Display profile completion progress
// ==========================================

import { useLocale } from '../../lib/locale.js'

function ProfileCompleteness({ percentage = 0 }) {

  const { t } = useLocale()

  // 01. VALIDATE PERCENTAGE

  const progress = Math.min(100, Math.max(0, percentage))


  // 02. PROGRESS BAR INTERFACE

  return (
    <div className="profile-completeness">

      <div className="profile-completeness-header">

        <span>{t('Profile Completeness', '资料完善度')}</span>

        <strong>{progress}%</strong>

      </div>

      <div
        className="profile-progress-track"
        role="progressbar"
        aria-label={t('Profile completeness', '资料完善度')}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >

        <div
          className="profile-progress-fill"
          style={{ width: `${progress}%` }}
        />

      </div>

    </div>
  )
}

export default ProfileCompleteness