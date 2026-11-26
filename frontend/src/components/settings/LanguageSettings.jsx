// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Language Settings
// PURPOSE: Display language preferences
// ==========================================

// Import icons
import { Globe, Check, Info } from 'lucide-react'


function LanguageSettings() {

  // 01. AVAILABLE LANGUAGES

  const languages = [
    {
      code: 'EN',
      name: 'English',
      nativeName: 'English'
    },
    {
      code: 'CH',
      name: 'Chinese',
      nativeName: '简体中文'
    }
  ]


  // 02. DEFAULT DISPLAY LANGUAGE

  const currentLanguage = 'EN'


  // 03. LANGUAGE SETTINGS INTERFACE

  return (

    <section className="settings-card">

      {/* Section heading */}

      <div className="settings-card-header">

        <div className="settings-card-icon">
          <Globe size={24} />
        </div>

        <div>
          <h2>Language Preferences</h2>

          <p>
            Choose your preferred display language.
          </p>
        </div>

      </div>


      {/* Available languages */}

      <div className="settings-language-list">

        {languages.map((language) => (

          <button
            key={language.code}
            type="button"
            disabled={language.code !== currentLanguage}
            className={`settings-language-option ${
              language.code === currentLanguage ? 'active' : ''
            }`}
          >

            <span className="settings-language-code">
              {language.code}
            </span>

            <div className="settings-option-content">

              <h3>{language.name}</h3>

              {language.nativeName !== language.name && (
                <p>{language.nativeName}</p>
                )}

            </div>

            {language.code === currentLanguage && (

              <Check
                size={20}
                className="settings-language-check"
              />

            )}

          </button>

        ))}

      </div>


      {/* Temporary availability notice */}

      <div className="settings-info">

        <Info size={18} />

        <p>
          More language options will be available soon.
        </p>

      </div>

    </section>

  )

}

export default LanguageSettings