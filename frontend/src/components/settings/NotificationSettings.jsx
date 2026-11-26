// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Notification Settings
// PURPOSE: Multilingual notification preferences
// ==========================================

// Import translation tools

// Import icons
import { Bell } from 'lucide-react'

// Import global user context
import { useUser } from '../../context/user.js'


// ==========================================
// 01. NOTIFICATION OPTIONS
// ==========================================

const notificationOptions = [

  {
    id: 'careerRecommendations',
    title: 'Career Recommendations',
    description: 'Receive personalized career suggestions.'
  },

  {
    id: 'jobAlerts',
    title: 'Job & Internship Alerts',
    description: 'Get notified about relevant job opportunities.'
  },

  {
    id: 'learningReminders',
    title: 'Learning Reminders',
    description: 'Stay on track with your learning goals.'
  },

  {
    id: 'roadmapUpdates',
    title: 'Career Roadmap Updates',
    description: 'Receive updates about your career progress.'
  },

  {
    id: 'platformUpdates',
    title: 'Platform Updates',
    description: 'Discover new features and improvements.'
  },

  {
    id: 'emailNotifications',
    title: 'Email Notifications',
    description: 'Receive notifications via email.'
  }

]


// ==========================================
// 02. NOTIFICATION SETTINGS COMPONENT
// ==========================================

function NotificationSettings() {

  // Global user data

  const { profile, updateProfileEdits } = useUser()


  // Translation tools

  // Current notification preferences

  const preferences = profile.notificationSettings || {}


  // 03. UPDATE NOTIFICATION PREFERENCES

  function handleNotificationChange(id) {

    updateProfileEdits(previous => ({

      ...previous,

      notificationSettings: {

        ...previous.notificationSettings,

        [id]: !(previous.notificationSettings?.[id] ?? false)

      }

    }))

  }


  // 04. NOTIFICATION SETTINGS INTERFACE

  return (

    <section className="settings-card">

      {/* Section heading */}

      <div className="settings-card-header">

        <div className="settings-card-icon">
          <Bell size={24} />
        </div>

        <div>

          <h2>
            {"Notification Preferences"}
          </h2>

          <p>
            {"Choose which notifications you want to receive."}
          </p>

        </div>

      </div>


      <div className="settings-divider" />


      {/* Notification options */}

      <div className="settings-notification-list">

        {notificationOptions.map(option => (

          <div
            key={option.id}
            className="settings-notification-row"
          >

            <div className="settings-option-content">

              <h3>
                {option.title}
              </h3>

              <p>
                {option.description}
              </p>

            </div>


            {/* Notification toggle */}

            <button
              type="button"
              role="switch"
              aria-label={option.title}
              aria-checked={preferences[option.id] ?? false}
              className={`
                settings-toggle
                ${preferences[option.id] ? 'active' : ''}
              `}
              onClick={() =>
                handleNotificationChange(option.id)
              }
            >

              <span className="settings-toggle-thumb" />

            </button>

          </div>

        ))}

      </div>


      {/* Frontend implementation notice */}

      <p className="settings-privacy-disclaimer">

        {"Notification delivery will be available after backend integration."}

      </p>

    </section>

  )

}

export default NotificationSettings
