// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Privacy Settings
// PURPOSE: Multilingual personal information visibility
// ==========================================

// Import translation tools

// Import icons
import { ShieldCheck, Lock } from 'lucide-react'

// Import global user context
import { useUser } from '../../context/user.js'

// Import reusable dropdown
import CustomDropdown from '../common/CustomDropdown'


// ==========================================
// 01. PRIVACY FIELDS
// ==========================================

const privacyFields = [

  { id: 'profilePhoto', label: "Profile Photo" },
  { id: 'firstName', label: "First Name" },
  { id: 'lastName', label: "Last Name" },
  { id: 'username', label: "Username" },
  { id: 'country', label: "Country" },
  { id: 'city', label: "City" },
  { id: 'currentStatus', label: "Current Status" },
  { id: 'careerGoal', label: "Career Goal" },
  { id: 'aboutMe', label: "About Me" }

]


// ==========================================
// 02. PRIVACY SETTINGS COMPONENT
// ==========================================

function PrivacySettings() {

  // Global user data

  const { profile, updateProfileEdits } = useUser()


  // Translation tools




  // Current privacy preferences

  const visibility = profile.privacySettings || {}


  // 03. TRANSLATED VISIBILITY OPTIONS

  const visibilityOptions = [

    {
      value: 'private',
      label: "Only Me"
    },

    {
      value: 'public',
      label: "Public"
    }

  ]


  // 04. UPDATE FIELD VISIBILITY

  function handleVisibilityChange(field, value) {

    updateProfileEdits(previous => ({

      ...previous,

      privacySettings: {

        ...previous.privacySettings,

        [field]: value

      }

    }))

  }


  // 05. PRIVACY SETTINGS INTERFACE

  return (

    <section className="settings-card">

      {/* Section heading */}

      <div className="settings-card-header">

        <div className="settings-card-icon">
          <ShieldCheck size={24} />
        </div>

        <div>

          <h2>{"Privacy & Visibility"}</h2>

          <p>
            {"Control who can see your personal information."}
          </p>

        </div>

      </div>


      <div className="settings-divider" />


      {/* Privacy information */}

      <div className="settings-privacy-notice">

        <ShieldCheck size={20} />

        <p>
          {"Your personal information is private by default. Choose what you want to share with others."}
        </p>

      </div>


      {/* Individual privacy settings */}

      <div className="settings-privacy-list">

        {privacyFields.map(field => (

          <div
            key={field.id}
            className="settings-privacy-row"
          >

            <CustomDropdown
              label={field.label}
              options={visibilityOptions}
              value={visibility[field.id] || 'private'}
              onChange={value =>
                handleVisibilityChange(field.id, value)
              }
              searchable={false}
            />

          </div>

        ))}

      </div>


      <div className="settings-divider" />


      {/* Permanently private information */}

      <div className="settings-private-information">

        <Lock size={20} />

        <div>

          <h3>{"Always Private"}</h3>

          <p>
            {"Your email address and date of birth are always private."}
          </p>

        </div>

      </div>


      {/* Frontend implementation notice */}

      <p className="settings-privacy-disclaimer">

        {"Visibility preferences are currently in preview mode. Privacy protection will be enabled after backend integration."}

      </p>

    </section>

  )

}

export default PrivacySettings
