// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Work Experience
// PURPOSE: Manage professional experience
// ==========================================

// Import icons
import {
  BriefcaseBusiness,
  Plus,
  Trash2
} from 'lucide-react'
// Import reusable date picker
import CVMonthYearPicker from './CVMonthYearPicker'

// ==========================================
// 01. WORK EXPERIENCE COMPONENT
// ==========================================

function WorkExperience({
  experiences = [],
  onChange,
  errors = {}
}) {

  // ==========================================
  // 02. ADD EXPERIENCE
  // ==========================================

  function handleAddExperience() {

    const newExperience = {
      id: crypto.randomUUID(),
      jobTitle: '',
      company: '',
      location: '',
      employmentType: '',
      startDate: '',
      endDate: '',
      currentlyWorking: false,
      description: ''
    }

    onChange([...experiences, newExperience])

  }


  // ==========================================
  // 03. UPDATE EXPERIENCE
  // ==========================================

  function handleUpdateExperience(id, field, value) {

    const updatedExperiences = experiences.map(experience => {

      if (experience.id !== id) {
        return experience
      }

      return {
        ...experience,
        [field]: value,

        // Clear end date for current positions
        ...(field === 'currentlyWorking' && value
          ? { endDate: '' }
          : {})
      }

    })

    onChange(updatedExperiences)

  }


  // ==========================================
  // 04. REMOVE EXPERIENCE
  // ==========================================

  function handleRemoveExperience(id) {

    onChange(
      experiences.filter(experience => experience.id !== id)
    )

  }


  // ==========================================
  // 05. COMPONENT INTERFACE
  // ==========================================

  return (

    <section className="cv-form-section">

      {/* SECTION HEADER */}

      <div className="cv-form-section-header">

        <BriefcaseBusiness
          size={24}
          aria-hidden="true"
        />

        <div>

          <h2>Work Experience</h2>

          <p>
          Add your previous and current professional experience (optional).
          </p>

        </div>

      </div>


      {/* EMPTY STATE */}

      {experiences.length === 0 && (

        <div className="cv-experience-empty">

          <BriefcaseBusiness
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
          />

          <h3>No work experience added</h3>

          <p>
            <p>
  Don't have professional experience yet?
  You can skip this step and continue building your CV.
</p>
          </p>

        </div>

      )}


      {/* EXPERIENCE LIST */}

      <div className="cv-experience-list">

        {experiences.map((experience, index) => (

          <article
            key={experience.id}
            className="cv-experience-card"
          >

            {/* EXPERIENCE HEADER */}

            <div className="cv-experience-header">

              <h3>Experience {index + 1}</h3>

              <button
                type="button"
                className="cv-remove-button"
                onClick={() =>
                  handleRemoveExperience(experience.id)
                }
                aria-label={`Remove experience ${index + 1}`}
                title="Remove experience"
              >

                <Trash2 size={18} />

              </button>

            </div>


            {/* EXPERIENCE FORM */}

            <div className="cv-form-grid">

              {/* JOB TITLE */}

              <div className="cv-form-field">

                <label htmlFor={`${experience.id}-title`}>
                  Job Title
                  <span className="cv-required"> *</span>
                </label>

                <input
                  id={`${experience.id}-title`}
                  type="text"
                  placeholder="e.g. Software Engineer"
                  value={experience.jobTitle}
                  onChange={event =>
                    handleUpdateExperience(
                      experience.id,
                      'jobTitle',
                      event.target.value
                    )
                  }
                  required
                />

              </div>


              {/* COMPANY */}

              <div className="cv-form-field">

                <label htmlFor={`${experience.id}-company`}>
                  Company
                  <span className="cv-required"> *</span>
                </label>

                <input
                  id={`${experience.id}-company`}
                  type="text"
                  placeholder="Enter company name"
                  value={experience.company}
                  onChange={event =>
                    handleUpdateExperience(
                      experience.id,
                      'company',
                      event.target.value
                    )
                  }
                  required
                />

              </div>


              {/* LOCATION */}

              <div className="cv-form-field">

                <label htmlFor={`${experience.id}-location`}>
                  Location
                </label>

                <input
                  id={`${experience.id}-location`}
                  type="text"
                  placeholder="City, Country"
                  value={experience.location}
                  onChange={event =>
                    handleUpdateExperience(
                      experience.id,
                      'location',
                      event.target.value
                    )
                  }
                />

              </div>


              {/* EMPLOYMENT TYPE */}

              <div className="cv-form-field">

                <label htmlFor={`${experience.id}-type`}>
                  Employment Type
                </label>

                <select
                  id={`${experience.id}-type`}
                  value={experience.employmentType}
                  onChange={event =>
                    handleUpdateExperience(
                      experience.id,
                      'employmentType',
                      event.target.value
                    )
                  }
                >

                  <option value="">Select employment type</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Contract">Contract</option>
                  <option value="Freelance">Freelance</option>
                  <option value="Self-employed">Self-employed</option>
                  <option value="Apprenticeship">Apprenticeship</option>
                  <option value="Volunteer">Volunteer</option>

                </select>

              </div>


              

              {/* START DATE */}

<div className="cv-form-field">

  <label htmlFor={`${experience.id}-start-month`}>
    Start Date
    <span className="cv-required"> *</span>
  </label>

  <CVMonthYearPicker
    id={`${experience.id}-start`}
    label="Start Date"
    value={experience.startDate}
    required
    onChange={value =>
      handleUpdateExperience(
        experience.id,
        'startDate',
        value
      )
    }
  />

</div>


              {/* END DATE */}

<div className="cv-form-field">

  <label htmlFor={`${experience.id}-end-month`}>
    End Date

    {!experience.currentlyWorking && (
      <span className="cv-required"> *</span>
    )}

  </label>

  <CVMonthYearPicker
    id={`${experience.id}-end`}
    label="End Date"
    value={experience.endDate}
    disabled={experience.currentlyWorking}
    required={!experience.currentlyWorking}
    onChange={value =>
      handleUpdateExperience(
        experience.id,
        'endDate',
        value
      )
    }
  />

</div>
              


              {/* CURRENT POSITION */}

              <div className="cv-form-field-full">

                <label className="cv-checkbox-label">

                  <input
                    type="checkbox"
                    checked={experience.currentlyWorking}
                    onChange={event =>
                      handleUpdateExperience(
                        experience.id,
                        'currentlyWorking',
                        event.target.checked
                      )
                    }
                  />

                  <span>I currently work here</span>

                </label>

              </div>


              {/* JOB DESCRIPTION */}

              <div className="cv-form-field cv-form-field-full">

                <label htmlFor={`${experience.id}-description`}>
                  Responsibilities & Achievements
                </label>

                <textarea
                  id={`${experience.id}-description`}
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe your responsibilities, achievements and contributions..."
                  value={experience.description}
                  onChange={event =>
                    handleUpdateExperience(
                      experience.id,
                      'description',
                      event.target.value
                    )
                  }
                />

                <span className="cv-character-counter">
                  {experience.description.length}/1000 characters
                </span>

              </div>

            </div>


            {/* VALIDATION MESSAGE */}

            {errors[experience.id] && (

              <p className="cv-field-error" role="alert">
                {errors[experience.id]}
              </p>

            )}

          </article>

        ))}

      </div>


      {/* ADD EXPERIENCE BUTTON */}

      <button
        type="button"
        className="cv-add-button"
        onClick={handleAddExperience}
      >

        <Plus size={20} />

        <span>Add Work Experience</span>

      </button>

    </section>

  )

}

export default WorkExperience