// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Profile Avatar
// PURPOSE: Upload, preview and remove profile photo
// ==========================================

// Import React tools
import { useRef, useState } from 'react'

// Import icons
import { UserRound, Camera, Upload, Trash2 } from 'lucide-react'


function ProfileAvatar({
  photo = null,
  onPhotoChange
}) {

  // 01. COMPONENT STATE

  const [menuOpen, setMenuOpen] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)


  // 02. OPEN FILE SELECTOR

  function handleUploadClick() {

    fileInputRef.current?.click()
    setMenuOpen(false)

  }


  // 03. VALIDATE AND PREVIEW PHOTO

  function handleFileChange(event) {

    const file = event.target.files?.[0]

    event.target.value = ''

    if (!file) return

    setError('')

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ]

    if (!allowedTypes.includes(file.type)) {

      setError('Please select a JPG, PNG or WEBP image.')
      return

    }

    if (file.size > 5 * 1024 * 1024) {

      setError('The image must be smaller than 5 MB.')
      return

    }

    const reader = new FileReader()

    reader.onload = () => {

      onPhotoChange(reader.result)

    }

    reader.onerror = () => {

      setError('Unable to read the selected image.')

    }

    reader.readAsDataURL(file)

  }


  // 04. REMOVE PHOTO

  function handleRemovePhoto() {

    onPhotoChange(null)
    setMenuOpen(false)
    setError('')

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
            alt="Profile"
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
        aria-label="Manage profile photo"
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

            {photo ? 'Change Photo' : 'Upload Photo'}

          </button>


          {photo && (

            <button
              type="button"
              className="remove-photo-button"
              onClick={handleRemovePhoto}
            >

              <Trash2 size={16} />

              Remove Photo

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