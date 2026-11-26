// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Profile Avatar
// PURPOSE: Upload, preview and remove profile photo
// ==========================================

// Import React tools
import { useRef, useState } from 'react'

// Import icons
import { apiErrorText, useLocale } from '../../lib/locale.js'
import { UserRound, Camera, Upload, Trash2 } from 'lucide-react'


function ProfileAvatar({
  photo = null,
  onPhotoChange,
  hasPhoto = Boolean(photo)
}) {

  // 01. COMPONENT STATE

  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const { t } = useLocale()

  const fileInputRef = useRef(null)


  // 02. OPEN FILE SELECTOR

  function handleUploadClick() {

    fileInputRef.current?.click()
    setMenuOpen(false)

  }


  function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || busy) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError(t('Please select a JPEG, PNG, or WebP image.', '请选择 JPEG、PNG 或 WebP 图片。'))
      return
    }
    if (!file.size || file.size > 5 * 1024 * 1024) {
      setError(t('Select a nonempty image up to 5 MiB.', '请选择不超过 5 MiB 的非空图片。'))
      return
    }
    void savePhoto(file)
  }

  async function savePhoto(file) {
    setBusy(true)
    setMenuOpen(false)
    setError('')
    try {
      await onPhotoChange(file)
    } catch (error) {
      setError(apiErrorText(error, t))
    } finally {
      setBusy(false)
    }
  }

  // 05. AVATAR INTERFACE

  return (

    <div
      className="profile-avatar-container"
      onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setMenuOpen(false)
        }
      }}
      onKeyDown={event => {
        if (event.key === 'Escape') {
          setMenuOpen(false)
        }
      }}
    >

      {/* Profile image */}

      <div className="profile-avatar-image">

        {photo ? (

          <img
            src={photo}
            alt={t('Profile photo', '头像')}
          />

        ) : (

          <UserRound size={42} />

        )}

      </div>


      {/* Camera button */}

      <button
        type="button"
        className="profile-avatar-camera"
        onClick={() => setMenuOpen(previous => !previous)}
        disabled={busy}
        aria-label={t('Manage profile photo', '管理头像')}
        aria-expanded={menuOpen}
      >

        <Camera size={17} />

      </button>


      {/* Hidden file input */}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        hidden
      />


      {/* Photo options */}

      {menuOpen && (

        <div className="profile-avatar-menu">

          <button
            type="button"
            onClick={handleUploadClick}
          >

            <Upload size={16} />

            {hasPhoto ? t('Change Photo', '更换头像') : t('Upload Photo', '上传头像')}

          </button>


          {hasPhoto && (

            <button
              type="button"
              className="remove-photo-button"
              onClick={() => savePhoto(null)}
            >

              <Trash2 size={16} />

              {t('Remove Photo', '移除头像')}

            </button>

          )}

        </div>

      )}


      {/* Validation error */}

      {error && (

        <p className="profile-avatar-error" role="alert">
          {error}
        </p>

      )}

    </div>

  )
}

export default ProfileAvatar