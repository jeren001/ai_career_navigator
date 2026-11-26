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
import { useState } from 'react'
import { Link } from 'react-router-dom'

// Import profile components
import CountryCitySelector from './CountryCitySelector'


// Import reusable dropdown
import { useLocale } from '../../lib/locale.js'
import { currentStatusOptions } from '../../lib/profile.js'
import CustomDropdown from '../common/CustomDropdown'

// 01. CURRENT STATUS OPTIONS




// 02. CAREER GOAL OPTIONS

const careerGoalOptions = [
  ['Exploring Career Options', '探索职业选项'],
  ['Looking for an Internship', '寻找实习'],
  ['Preparing for My First Job', '准备第一份工作'],
  ['Looking for a Job', '寻找工作'],
  ['Developing New Skills', '培养新技能'],
  ['Advancing My Career', '推进职业发展'],
  ['Changing Careers', '转行'],
  ['Starting a Business', '创业']
]


// 03. PERSONAL INFORMATION COMPONENT

function PersonalInformation({
  profile,
  isEditing = false,
  onChange,
  onSave
}) {
  const { t } = useLocale()
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  function localizedOptions(options, current) {
    const labels = options.map(([value, zh]) => ({ value, label: t(value, zh) }))
    if (current && !labels.some(({ value }) => value === current)) labels.push({ value: current, label: current })
    return labels
  }

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
          <h2>{t('Personal Information', '个人信息')}</h2>
          <p>{t('Manage your personal details.', '管理你的个人资料。')}</p>
        </div>

      </div>


      {/* 02. PERSONAL INFORMATION FORM */}

      <form onSubmit={handleSubmit}>

        <div className="profile-form-grid">


          {/* First Name */}

          <div className="profile-form-field">

            <label htmlFor="firstName">
              {t('First Name', '名')}
            </label>

            <input
              id="firstName"
              type="text"
              value={profile.firstName}
              onChange={e =>
                onChange('firstName', e.target.value)
              }
              disabled={!isEditing}
              placeholder={t('Enter first name', '输入名')}
              maxLength={120}
            />

          </div>


          {/* Last Name */}

          <div className="profile-form-field">

            <label htmlFor="lastName">
              {t('Last Name', '姓')}
            </label>

            <input
              id="lastName"
              type="text"
              value={profile.lastName}
              onChange={e =>
                onChange('lastName', e.target.value)
              }
              disabled={!isEditing}
              placeholder={t('Enter last name', '输入姓')}
              maxLength={120}
            />

          </div>


          {/* Username */}

<div className="profile-form-field">

  <label htmlFor="username">
    {t('Username', '用户名')}
  </label>

  <input
    id="username"
    type="text"
    value={profile.username}
    onChange={e =>
      onChange('username', e.target.value)
    }
    disabled={!isEditing}
    placeholder={t('Choose a username', '选择用户名')}
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
          ? t('Valid username format', '用户名格式有效')
          : t('Use 3–20 letters, numbers, underscores or dots.', '使用 3–20 个英文字母、数字、下划线或点。')
        }
      </span>

    </div>

  )}

{/* Smart username suggestions */}

{isEditing && usernameSuggestions.length > 0 && (

  <div className="username-suggestions">

    <p className="username-suggestions-title">
      {t('Suggested usernames', '建议的用户名')}
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
              {t('Email Address', '邮箱地址')}
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
              {t('Date of Birth', '出生日期')}
            </label>

            <input
              id="dateOfBirth"
              type="date"
              min="1900-01-01"
              max={today}
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
            label={t('Current Status', '当前状态')}
            options={localizedOptions(currentStatusOptions, profile.currentStatus)}
            value={profile.currentStatus}
            onChange={value =>
                onChange('currentStatus', value)
            }
            placeholder={t('Select your current status', '选择当前状态')}
            searchable={false}
            disabled={!isEditing}
            />


          {/* Career Goal */}

        <div className="profile-form-field full-width">

        <CustomDropdown
            label={t('Career Goal', '职业目标')}
            options={localizedOptions(careerGoalOptions, profile.careerGoal)}
            value={profile.careerGoal}
            onChange={value =>
            onChange('careerGoal', value)
            }
            placeholder={t('Select your career goal', '选择职业目标')}
            searchable={false}
            disabled={!isEditing}
        />

        </div>


          {/* About Me */}

          <div className="profile-form-field full-width">

            <label htmlFor="aboutMe">
              {t('About Me', '关于我')}
            </label>

            <textarea
              id="aboutMe"
              value={profile.aboutMe}
              onChange={e =>
                onChange('aboutMe', e.target.value)
              }
              disabled={!isEditing}
              placeholder={t('Tell us a little about yourself...', '简单介绍一下自己…')}
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
            {t('Manage visibility in', '在此管理资料可见性')}{' '}
            <Link to="/settings">
              {t('Settings', '设置')}
            </Link>.
          </span>

        </div>


        {/* 04. SAVE CHANGES */}

<button
  type="submit"
  className="profile-save-button"
  disabled={!isEditing || !isUsernameValid}
>
  {t('Save Changes', '保存更改')}
</button>

      </form>

    </div>

  )
}

export default PersonalInformation
