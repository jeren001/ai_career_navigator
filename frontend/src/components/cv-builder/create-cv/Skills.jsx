import { useLocale } from '../../../lib/locale.js'
import { cvLabel } from '../cvLabels.js'
// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Skills
// PURPOSE: Manage skills and language proficiency
// ==========================================

// Import React tools
import { useState } from 'react'

// Import icons
import {
  Code2,
  UsersRound,
  Languages,
  Plus,
  X,
  Sparkles,
  Trash2
} from 'lucide-react'


// ==========================================
// 01. LANGUAGE LEVELS
// ==========================================

const languageLevels = [
  'Beginner (A1)',
  'Elementary (A2)',
  'Intermediate (B1)',
  'Upper Intermediate (B2)',
  'Advanced (C1)',
  'Proficient (C2)',
  'Native'
]


// ==========================================
// 02. REUSABLE SKILL INPUT
// ==========================================

function SkillInput({
  title,
  description,
  icon: Icon,
  skills = [],
  placeholder,
  onChange
}) {

  const [input, setInput] = useState('')
  const [error, setError] = useState('')


  // Add a new skill

  function handleAddSkill() {

    const skill = input.trim()

    if (!skill) return

    const alreadyExists = skills.some(
      item => item.toLowerCase() === skill.toLowerCase()
    )

    if (alreadyExists) {
      setError('This skill has already been added.')
      return
    }

    onChange([...skills, skill])

    setInput('')
    setError('')

  }


  // Remove a skill

  function handleRemoveSkill(skill) {

    onChange(
      skills.filter(item => item !== skill)
    )

    setError('')

  }


  // Handle keyboard interaction

  function handleKeyDown(event) {

    if (event.nativeEvent.isComposing) return

    if (event.key === 'Enter') {

      event.preventDefault()
      handleAddSkill()

    }

  }


  return (

    <div className="cv-skill-category">

      {/* CATEGORY HEADER */}

      <div className="cv-skill-category-header">

        <Icon size={22} aria-hidden="true" />

        <div>

          <h3>{title}</h3>

          <p>{description}</p>

        </div>

      </div>


      {/* SKILL INPUT */}

      <div className="cv-skill-input-row">

        <input
          type="text"
          aria-label={`Add ${title}`}
          placeholder={placeholder}
          value={input}
          maxLength={60}
          onChange={event => {
            setInput(event.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
        />

        <button
          type="button"
          className="cv-skill-add-button"
          onClick={handleAddSkill}
          disabled={!input.trim()}
        >

          <Plus size={18} />

          <span>Add</span>

        </button>

      </div>


      {/* VALIDATION MESSAGE */}

      {error && (

        <p className="cv-field-error" role="alert">
          {error}
        </p>

      )}


      {/* SKILL TAGS */}

      <div className="cv-skill-tags">

        {skills.map(skill => (

          <span
            key={skill}
            className="cv-skill-tag"
          >

            {skill}

            <button
              type="button"
              onClick={() => handleRemoveSkill(skill)}
              aria-label={`Remove ${skill}`}
            >

              <X size={15} />

            </button>

          </span>

        ))}

      </div>

      {skills.length === 0 && (

        <p className="cv-skill-empty">
          No skills added yet.
        </p>

      )}

    </div>

  )

}


// ==========================================
// 03. MAIN SKILLS COMPONENT
// ==========================================

function Skills({
  data,
  onChange,
  errors = {},
  mode = 'all',
  inSectionEditor = false
}) {
  const { locale } = useLocale()
  const label = (value) => cvLabel(value, locale)

  const technicalSkills = data.technicalSkills || []
  const softSkills = data.softSkills || []
  const languages = data.languages || []


  // ==========================================
  // 04. ADD LANGUAGE
  // ==========================================

  function handleAddLanguage() {

    const newLanguage = {
      id: crypto.randomUUID(),
      name: '',
      level: ''
    }

    onChange(
      'languages',
      [...languages, newLanguage]
    )

  }


  // ==========================================
  // 05. UPDATE LANGUAGE
  // ==========================================

  function handleUpdateLanguage(id, field, value) {

    const updatedLanguages = languages.map(language => {

      if (language.id !== id) {
        return language
      }

      return {
        ...language,
        [field]: value
      }

    })

    onChange('languages', updatedLanguages)

  }


  // ==========================================
  // 06. REMOVE LANGUAGE
  // ==========================================

  function handleRemoveLanguage(id) {

    onChange(
      'languages',
      languages.filter(language => language.id !== id)
    )

  }


  // ==========================================
  // 07. COMPONENT INTERFACE
  // ==========================================

  function renderRemoveLanguage(language, index) {
    return (
      <button type="button" className="cv-remove-button"
        onClick={() => handleRemoveLanguage(language.id)}
        aria-label={`Remove language ${index + 1}`} title="Remove language">
        <Trash2 size={18} aria-hidden="true" />
      </button>
    )
  }

  return (

    <section className="cv-form-section">

      {mode !== 'languages' && (<>
      {/* SECTION HEADER */}

      <div className="cv-form-section-header">

        <Sparkles size={24} aria-hidden="true" />

        <div>

          <h2>{label('Skills')}</h2>

          <p>
            Highlight your abilities, strengths and languages (optional).
          </p>

        </div>

      </div>


      {/* TECHNICAL SKILLS */}

      <SkillInput
        title="Technical Skills"
        description="Add your technical abilities, tools and technologies."
        icon={Code2}
        skills={technicalSkills}
        placeholder="e.g. Python, React, Microsoft Excel"
        onChange={value =>
          onChange('technicalSkills', value)
        }
      />


      {/* SOFT SKILLS */}

      <SkillInput
        title="Soft Skills"
        description="Add your interpersonal and professional strengths."
        icon={UsersRound}
        skills={softSkills}
        placeholder="e.g. Communication, Teamwork"
        onChange={value =>
          onChange('softSkills', value)
        }
      />


      </>)}

      {/* LANGUAGES */}

      {mode !== 'skills' && (
      <div className="cv-skill-category cv-language-category">

        <div className="cv-skill-category-header">

          <Languages size={22} aria-hidden="true" />

          <div>

            <h3>Languages</h3>

            <p>
              Add the languages you speak and your proficiency level.
            </p>

          </div>

        </div>


        {/* LANGUAGE EMPTY STATE */}

        {languages.length === 0 && (

          <p className="cv-skill-empty">
            No languages added yet.
          </p>

        )}


        {/* LANGUAGE LIST */}

        <div className="cv-language-list">

          {languages.map((language, index) => (

            <div
              key={language.id}
              className="cv-language-item"
            >

              {inSectionEditor && (
                <div className="cv-experience-header">
                  <h3>Language {index + 1}</h3>
                  {renderRemoveLanguage(language, index)}
                </div>
              )}

              <div className="cv-language-row">

                {/* LANGUAGE NAME */}

                <div className="cv-form-field">

                  <label htmlFor={`${language.id}-name`}>
                    Language
                    <span className="cv-required"> *</span>
                  </label>

                  <input
                    id={`${language.id}-name`}
                    type="text"
                    placeholder="e.g. English"
                    value={language.name}
                    maxLength={60}
                    required
                    onChange={event =>
                      handleUpdateLanguage(
                        language.id,
                        'name',
                        event.target.value
                      )
                    }
                  />

                </div>


                {/* PROFICIENCY LEVEL */}

                <div className="cv-form-field">

                  <label htmlFor={`${language.id}-level`}>
                    Proficiency
                    <span className="cv-required"> *</span>
                  </label>

                  <select
                    id={`${language.id}-level`}
                    value={language.level}
                    required
                    onChange={event =>
                      handleUpdateLanguage(
                        language.id,
                        'level',
                        event.target.value
                      )
                    }
                  >

                    <option value="">
                      Select level
                    </option>

                    {languageLevels.map(level => (

                      <option key={level} value={level}>
                        {level}
                      </option>

                    ))}

                  </select>

                </div>


                {!inSectionEditor && renderRemoveLanguage(language, index)}

              </div>


              {/* VALIDATION MESSAGE */}

              {errors[language.id] && (

                <p className="cv-field-error" role="alert">
                  {errors[language.id]}
                </p>

              )}

            </div>

          ))}

        </div>


        {/* ADD LANGUAGE BUTTON */}

        <button
          type="button"
          className="cv-add-button"
          onClick={handleAddLanguage}
        >

          <Plus size={18} />

          <span>Add Language</span>

        </button>

      </div>

      )}

    </section>

  )

}

export default Skills