// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Basic Information
// PURPOSE: Collect personal and professional data
// ==========================================

// Import country data
import { Country } from 'country-state-city'
// Import international phone number input
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'
// Import icons
import { UserRound } from 'lucide-react'


// ==========================================
// 01. FORM CONFIGURATION
// ==========================================

const countries = Country.getAllCountries()

const careerLevels = [
  'Student',
  'Recent Graduate',
  'Entry Level',
  'Mid Level',
  'Senior Level',
  'Manager',
  'Executive',
  'Career Changer'
]

const MAX_SUMMARY_LENGTH = 500


// ==========================================
// 02. BASIC INFORMATION COMPONENT
// ==========================================

export function ProfessionalSummaryField({ value = '', onChange }) {
  return (
    <div className="cv-form-field cv-form-field-full">
      <label htmlFor="cv-summary">Professional Summary</label>
      <textarea
        id="cv-summary"
        placeholder="Write a short introduction about your professional background, skills and career goals..."
        rows={5}
        maxLength={MAX_SUMMARY_LENGTH}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
      <span className="cv-character-counter">{value.length}/{MAX_SUMMARY_LENGTH} characters</span>
    </div>
  )
}

function BasicInformation({
  data,
  onChange,
  errors = {},
  showSummary = true
}) {

  return (

    <section className="cv-form-section">

      {/* SECTION HEADER */}

      <div className="cv-form-section-header">

        <UserRound
          size={24}
          aria-hidden="true"
        />

        <div>

          <h2>Basic Information</h2>

          <p>
            Let's start with your personal and professional details.
          </p>

        </div>

      </div>


      {/* FORM GRID */}

      <div className="cv-form-grid">

        {/* 01. FULL NAME */}

        <div className="cv-form-field">

          <label htmlFor="cv-full-name">
            Full Name <span className="cv-required">*</span>
          </label>

          <input
            id="cv-full-name"
            type="text"
            placeholder="Enter your full name"
            autoComplete="name"
            value={data.fullName || ''}
            onChange={(event) =>
              onChange('fullName', event.target.value)
            }
            required
            aria-invalid={Boolean(errors.fullName)}
          />

          {errors.fullName && (
            <span className="cv-field-error">
              {errors.fullName}
            </span>
          )}

        </div>


        {/* 02. TARGET POSITION */}

        <div className="cv-form-field">

          <label htmlFor="cv-job-title">
            Job Title / Target Position
            <span className="cv-required"> *</span>
          </label>

          <input
            id="cv-job-title"
            type="text"
            placeholder="e.g. AI Engineer"
            value={data.jobTitle || ''}
            onChange={(event) =>
              onChange('jobTitle', event.target.value)
            }
            required
            aria-invalid={Boolean(errors.jobTitle)}
          />

          {errors.jobTitle && (
            <span className="cv-field-error">
              {errors.jobTitle}
            </span>
          )}

        </div>


        {/* 03. EMAIL */}

        <div className="cv-form-field">

          <label htmlFor="cv-email">
            Email <span className="cv-required">*</span>
          </label>

          <input
            id="cv-email"
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            value={data.email || ''}
            onChange={(event) =>
              onChange('email', event.target.value)
            }
            required
            aria-invalid={Boolean(errors.email)}
          />

          {errors.email && (
            <span className="cv-field-error">
              {errors.email}
            </span>
          )}

        </div>


        {/* 04. CAREER LEVEL */}

        <div className="cv-form-field">

          <label htmlFor="cv-career-level">
            Career Level
            <span className="cv-required"> *</span>
          </label>

          <select
            id="cv-career-level"
            value={data.careerLevel || ''}
            onChange={(event) =>
              onChange('careerLevel', event.target.value)
            }
            required
            aria-invalid={Boolean(errors.careerLevel)}
          >

            <option value="" disabled>
              Select your career level
            </option>

            {careerLevels.map(level => (

              <option key={level} value={level}>
                {level}
              </option>

            ))}

          </select>

          {errors.careerLevel && (
            <span className="cv-field-error">
              {errors.careerLevel}
            </span>
          )}

        </div>


                {/* 05. PHONE NUMBER */}

        <div className="cv-form-field">

          <label htmlFor="cv-phone">
            Phone Number
          </label>

          <PhoneInput
            id="cv-phone"
            className="cv-phone-input"
            international
            countryCallingCodeEditable={false}
            defaultCountry={data.phoneCountry || undefined}
            placeholder="Enter phone number"
            autoComplete="tel"
            value={data.phone || undefined}
            onChange={(value) =>
              onChange('phone', value || '')
            }
            onCountryChange={(country) =>
              onChange('phoneCountry', country || '')
            }
            aria-invalid={Boolean(errors.phone)}
            countrySelectProps={{
              'aria-label': 'Select country calling code'
            }}
          />

          {errors.phone && (

            <span className="cv-field-error">
              {errors.phone}
            </span>

          )}



        </div>


        {/* 06. TARGET COUNTRY */}

        <div className="cv-form-field">

          <label htmlFor="cv-target-country">
            Target Country
          </label>

          <select
            id="cv-target-country"
            value={data.targetCountry || ''}
            onChange={(event) =>
              onChange('targetCountry', event.target.value)
            }
          >

            <option value="">
              Select a country
            </option>

            {countries.map(country => (

              <option
                key={country.isoCode}
                value={country.isoCode}
              >
                {country.name}
              </option>

            ))}

          </select>

        </div>


        {/* 07. CURRENT LOCATION */}

        <div className="cv-form-field">

          <label htmlFor="cv-location">
            Location
            <span className="cv-required"> *</span>
          </label>

          <input
            id="cv-location"
            type="text"
            placeholder="e.g. Amsterdam, Netherlands"
            value={data.location || ''}
            onChange={(event) =>
              onChange('location', event.target.value)
            }
            required
            aria-invalid={Boolean(errors.location)}
          />

          {errors.location && (
            <span className="cv-field-error">
              {errors.location}
            </span>
          )}

        </div>


        {showSummary && <ProfessionalSummaryField value={data.summary} onChange={value => onChange('summary', value)} />}

      </div>

    </section>

  )

}

export default BasicInformation