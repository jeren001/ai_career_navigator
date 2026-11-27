// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Education
// PURPOSE: Manage academic qualifications
// ==========================================

// Import icons
import {
  GraduationCap,
  Plus,
  Trash2
} from 'lucide-react'
// Import reusable date picker
import CVMonthYearPicker from './CVMonthYearPicker'

// ==========================================
// 01. EDUCATION CONFIGURATION
// ==========================================

const degreeTypes = [
  'High School',
  'Vocational Training',
  'Diploma',
  'Associate Degree',
  "Bachelor's Degree",
  "Master's Degree",
  'Doctorate (PhD)',
  'Other'
]


// ==========================================
// 02. EDUCATION COMPONENT
// ==========================================

function Education({
  education = [],
  onChange,
  errors = {}
}) {

  // ==========================================
  // 03. ADD EDUCATION
  // ==========================================

  function handleAddEducation() {

    const newEducation = {
      id: crypto.randomUUID(),
      institution: '',
      degree: '',
      fieldOfStudy: '',
      location: '',
      startDate: '',
      endDate: '',
      currentlyStudying: false,
      grade: '',
      description: ''
    }

    onChange([...education, newEducation])

  }


  // ==========================================
  // 04. UPDATE EDUCATION
  // ==========================================

  function handleUpdateEducation(id, field, value) {

    const updatedEducation = education.map(item => {

      if (item.id !== id) {
        return item
      }

      return {
        ...item,
        [field]: value
      }

    })

    onChange(updatedEducation)

  }


  // ==========================================
  // 05. REMOVE EDUCATION
  // ==========================================

  function handleRemoveEducation(id) {

    onChange(
      education.filter(item => item.id !== id)
    )

  }


  // ==========================================
  // 06. COMPONENT INTERFACE
  // ==========================================

  return (

    <section className="cv-form-section">

      {/* SECTION HEADER */}

      <div className="cv-form-section-header">

        <GraduationCap
          size={24}
          aria-hidden="true"
        />

        <div>

          <h2>Education</h2>

          <p>
            Add your academic background and qualifications (optional).
          </p>

        </div>

      </div>


      {/* EMPTY STATE */}

      {education.length === 0 && (

        <div className="cv-experience-empty">

          <GraduationCap
            size={40}
            strokeWidth={1.5}
            aria-hidden="true"
          />

          <h3>No education added</h3>

          <p>You can add your educational background or skip this step.</p>

        </div>

      )}


      {/* EDUCATION LIST */}

      <div className="cv-experience-list">

        {education.map((item, index) => (

          <article
            key={item.id}
            className="cv-experience-card"
          >

            {/* EDUCATION CARD HEADER */}

            <div className="cv-experience-header">

              <h3>Education {index + 1}</h3>

              <button
                type="button"
                className="cv-remove-button"
                onClick={() =>
                  handleRemoveEducation(item.id)
                }
                aria-label={`Remove education ${index + 1}`}
                title="Remove education"
              >

                <Trash2 size={18} />

              </button>

            </div>


            {/* EDUCATION FORM */}

            <div className="cv-form-grid">

              {/* INSTITUTION */}

              <div className="cv-form-field">

                <label htmlFor={`${item.id}-institution`}>
                  Institution
                  <span className="cv-required"> *</span>
                </label>

                <input
                  id={`${item.id}-institution`}
                  type="text"
                  placeholder="University or school name"
                  value={item.institution}
                  onChange={event =>
                    handleUpdateEducation(
                      item.id,
                      'institution',
                      event.target.value
                    )
                  }
                  required
                />

              </div>


              {/* DEGREE */}

              <div className="cv-form-field">

                <label htmlFor={`${item.id}-degree`}>
                  Degree
                  <span className="cv-required"> *</span>
                </label>

                <select
                  id={`${item.id}-degree`}
                  value={item.degree}
                  onChange={event =>
                    handleUpdateEducation(
                      item.id,
                      'degree',
                      event.target.value
                    )
                  }
                  required
                >

                  <option value="">
                    Select degree
                  </option>

                  {degreeTypes.map(degree => (

                    <option key={degree} value={degree}>
                      {degree}
                    </option>

                  ))}

                </select>

              </div>


              {/* FIELD OF STUDY */}

              <div className="cv-form-field">

                <label htmlFor={`${item.id}-field`}>
                  Field of Study
                </label>

                <input
                  id={`${item.id}-field`}
                  type="text"
                  placeholder="e.g. Artificial Intelligence"
                  value={item.fieldOfStudy}
                  onChange={event =>
                    handleUpdateEducation(
                      item.id,
                      'fieldOfStudy',
                      event.target.value
                    )
                  }
                />

              </div>


              {/* LOCATION */}

              <div className="cv-form-field">

                <label htmlFor={`${item.id}-location`}>
                  Location
                </label>

                <input
                  id={`${item.id}-location`}
                  type="text"
                  placeholder="City, Country"
                  value={item.location}
                  onChange={event =>
                    handleUpdateEducation(
                      item.id,
                      'location',
                      event.target.value
                    )
                  }
                />

              </div>


              {/* START DATE */}

<div className="cv-form-field">

  <label htmlFor={`${item.id}-start-month`}>
    Start Date
    <span className="cv-required"> *</span>
  </label>

  <CVMonthYearPicker
    id={`${item.id}-start`}
    label="Start Date"
    value={item.startDate}
    required
    onChange={value =>
      handleUpdateEducation(
        item.id,
        'startDate',
        value
      )
    }
  />

</div>



{/* END DATE / EXPECTED GRADUATION */}

<div className="cv-form-field">

  <label htmlFor={`${item.id}-end-month`}>

    {item.currentlyStudying
      ? 'Expected Graduation'
      : 'End Date'}

    {!item.currentlyStudying && (
      <span className="cv-required"> *</span>
    )}

  </label>

  <CVMonthYearPicker
    id={`${item.id}-end`}
    label={
      item.currentlyStudying
        ? 'Expected Graduation'
        : 'End Date'
    }
    value={item.endDate}
    required={!item.currentlyStudying}
    maxYear={
      new Date().getFullYear() +
      (item.currentlyStudying ? 10 : 0)
    }
    onChange={value =>
      handleUpdateEducation(
        item.id,
        'endDate',
        value
      )
    }
  />

</div>

              {/* CURRENTLY STUDYING */}

              <div className="cv-form-field-full">

                <label className="cv-checkbox-label">

                  <input
                    type="checkbox"
                    checked={item.currentlyStudying}
                    onChange={event =>
                      handleUpdateEducation(
                        item.id,
                        'currentlyStudying',
                        event.target.checked
                      )
                    }
                  />

                  <span>I currently study here</span>

                </label>

              </div>


              {/* GRADE */}

              <div className="cv-form-field cv-form-field-full">

                <label htmlFor={`${item.id}-grade`}>
                  Grade / GPA
                </label>

                <input
                  id={`${item.id}-grade`}
                  type="text"
                  placeholder="e.g. 3.8/4.0 or 85/100"
                  value={item.grade}
                  onChange={event =>
                    handleUpdateEducation(
                      item.id,
                      'grade',
                      event.target.value
                    )
                  }
                />

              </div>


              {/* ACADEMIC DESCRIPTION */}

              <div className="cv-form-field cv-form-field-full">

                <label htmlFor={`${item.id}-description`}>
                  Academic Achievements & Activities
                </label>

                <textarea
                  id={`${item.id}-description`}
                  rows={5}
                  maxLength={1000}
                  placeholder="Describe relevant coursework, projects, scholarships, awards or academic activities..."
                  value={item.description}
                  onChange={event =>
                    handleUpdateEducation(
                      item.id,
                      'description',
                      event.target.value
                    )
                  }
                />

                <span className="cv-character-counter">
                  {item.description.length}/1000 characters
                </span>

              </div>

            </div>


            {/* VALIDATION MESSAGE */}

            {errors[item.id] && (

              <p className="cv-field-error" role="alert">
                {errors[item.id]}
              </p>

            )}

          </article>

        ))}

      </div>


      {/* ADD EDUCATION BUTTON */}

      <button
        type="button"
        className="cv-add-button"
        onClick={handleAddEducation}
      >

        <Plus size={20} />

        <span>Add Education</span>

      </button>

    </section>

  )

}

export default Education