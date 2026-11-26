// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Personal Information
// PURPOSE: Manage user personal details
// ==========================================

// Import icons
import {
  UserRound,
  Lock,
  CheckCircle2,
  XCircle
} from 'lucide-react'

// Import reusable username validation
import {
  validateUsername,
  generateUsernameSuggestions
} from '../../utils/usernameUtils'

// Import navigation
import { Link } from 'react-router-dom'

// Import profile components
import CountryCitySelector from './CountryCitySelector'


// Import reusable dropdown
import CustomDropdown from '../common/CustomDropdown'

// 01. CURRENT STATUS OPTIONS

const currentStatusOptions = [
  'High School Student',
  'University Student',
  'Recent Graduate',
  'Employed',
  'Self-employed',
  'Unemployed',
  'Other'
]


// 02. CAREER GOAL OPTIONS

const careerGoalOptions = [
  'Exploring Career Options',
  'Looking for an Internship',
  'Preparing for My First Job',
  'Looking for a Job',
  'Developing New Skills',
  'Advancing My Career',
  'Changing Careers',
  'Starting a Business'
]


// 03. PERSONAL INFORMATION COMPONENT

function PersonalInformation({
  profile,
  isEditing = false,
  onChange,
  onSave
}) {

    // Validate current username
const isUsernameValid = !profile.username || validateUsername(profile.username)

// Generate username suggestions from personal name
const fullName = `${profile.firstName} ${profile.lastName}`

const usernameSuggestions =
  generateUsernameSuggestions(fullName, profile.username)

  // Handle profile form submission

function handleSubmit(event) {

  event.preventDefault()

  if (isEditing && isUsernameValid) {
    onSave()
  }

}

  return (

    <div className="personal-information-card">

      {/* 01. SECTION HEADER */}

      <div className="personal-information-header">

        <div className="personal-information-icon">
          <UserRound size={22} />
        </div>

        <div>
          <h2>Personal Information</h2>
          <p>Manage your personal details.</p>
        </div>

      </div>


      {/* 02. PERSONAL INFORMATION FORM */}

      <form onSubmit={handleSubmit}>

        <div className="profile-form-grid">


          {/* First Name */}

          <div className="profile-form-field">

            <label htmlFor="firstName">
              First Name
            </label>

            <input
              id="firstName"
              type="text"
              value={profile.firstName}
              onChange={e =>
                onChange('firstName', e.target.value)
              }
              disabled={!isEditing}
              placeholder="Enter first name"
              required
            />

          </div>


          {/* Last Name */}

          <div className="profile-form-field">

            <label htmlFor="lastName">
              Last Name
            </label>

            <input
              id="lastName"
              type="text"
              value={profile.lastName}
              onChange={e =>
                onChange('lastName', e.target.value)
              }
              disabled={!isEditing}
              placeholder="Enter last name"
              required
            />

          </div>


          {/* Username */}

<div className="profile-form-field">

  <label htmlFor="username">
    Username
  </label>

  <input
    id="username"
    type="text"
    value={profile.username}
    onChange={e =>
      onChange('username', e.target.value)
    }
    disabled={!isEditing}
    placeholder="Choose a username"
    autoComplete="username"
    autoCapitalize="none"
    spellCheck={false}
    minLength={3}
    maxLength={20}
    aria-invalid={isEditing && !isUsernameValid}
    aria-describedby={
      isEditing && profile.username ? 'profile-username-validation' : undefined
    }
  />

  {/* Dynamic username validation */}

  {isEditing && profile.username && (

    <div
      id="profile-username-validation"
      className={`profile-username-validation ${
        isUsernameValid ? 'valid' : 'invalid'
      }`}
      role="status"
    >

      {isUsernameValid
        ? <CheckCircle2 size={15} />
        : <XCircle size={15} />
      }

      <span>
        {isUsernameValid
          ? 'Valid username format'
          : 'Use 3–20 letters, numbers, underscores or dots.'
        }
      </span>

    </div>

  )}

{/* Smart username suggestions */}

{isEditing && usernameSuggestions.length > 0 && (

  <div className="username-suggestions">

    <p className="username-suggestions-title">
      Suggested usernames
    </p>

    <div className="username-suggestions-list">

      {usernameSuggestions.map(suggestion => (

        <button
          key={suggestion}
          type="button"
          className="username-suggestion"
          onClick={() =>
            onChange('username', suggestion)
          }
        >
          @{suggestion}
        </button>

      ))}

    </div>

  </div>

)}
</div>


          {/* Email Address */}

          <div className="profile-form-field">

            <label htmlFor="email">
              Email Address
            </label>

            <input
              id="email"
              type="email"
              value={profile.email}
              disabled
            />

          </div>


          {/* Date of Birth */}

          <div className="profile-form-field">

            <label htmlFor="dateOfBirth">
              Date of Birth
            </label>

            <input
              id="dateOfBirth"
              type="date"
              value={profile.dateOfBirth}
              onChange={e =>
                onChange('dateOfBirth', e.target.value)
              }
              disabled={!isEditing}
            />

          </div>


          {/* Country and City */}

          <CountryCitySelector
            country={profile.country}
            city={profile.city}
            onCountryChange={value =>
              onChange('country', value)
            }
            onCityChange={value =>
              onChange('city', value)
            }
            disabled={!isEditing}
          />


          {/* Current Status */}

            <CustomDropdown
            label="Current Status"
            options={currentStatusOptions.map(option => ({
                value: option,
                label: option
            }))}
            value={profile.currentStatus}
            onChange={value =>
                onChange('currentStatus', value)
            }
            placeholder="Select your current status"
            searchable={false}
            disabled={!isEditing}
            />


          {/* Career Goal */}

        <div className="profile-form-field full-width">

        <CustomDropdown
            label="Career Goal"
            options={[...new Set([...careerGoalOptions, ...(profile.careerGoal ? [profile.careerGoal] : [])])].map(option => ({
            value: option,
            label: option
            }))}
            value={profile.careerGoal}
            onChange={value =>
            onChange('careerGoal', value)
            }
            placeholder="Select your career goal"
            searchable={false}
            disabled={!isEditing}
        />

        </div>


          {/* About Me */}

          <div className="profile-form-field full-width">

            <label htmlFor="aboutMe">
              About Me
            </label>

            <textarea
              id="aboutMe"
              value={profile.aboutMe}
              onChange={e =>
                onChange('aboutMe', e.target.value)
              }
              disabled={!isEditing}
              placeholder="Tell us a little about yourself..."
              rows={5}
              maxLength={500}
            />

            <span className="profile-character-count">
              {profile.aboutMe.length}/500
            </span>

          </div>

        </div>


        {/* 03. PRIVACY INFORMATION */}

        <div className="profile-privacy-note">

          <Lock size={15} />

          <span>
            Manage your information visibility in{' '}
            <Link to="/settings">
              Settings
            </Link>.
          </span>

        </div>


        {/* 04. SAVE CHANGES */}

<button
  type="submit"
  className="profile-save-button"
  disabled={!isEditing || !isUsernameValid}
>
  Save Changes
</button>

      </form>

    </div>

  )
}

export default PersonalInformation
