// ==========================================
// PROJECT: AI CAREER
// COMPONENT: CV Step Indicator
// PURPOSE: Display CV creation progress
// ==========================================

// Import icons
import { Check } from 'lucide-react'


// ==========================================
// 01. STEP CONFIGURATION
// ==========================================

const steps = [
  {
    id: 1,
    label: 'Basic Information'
  },
  {
    id: 2,
    label: 'Work Experience'
  },
  {
    id: 3,
    label: 'Education'
  },
  {
    id: 4,
    label: 'Skills'
  },
  {
    id: 5,
    label: 'Template & Create'
  }
]


// ==========================================
// 02. STEP INDICATOR COMPONENT
// ==========================================

function CVStepIndicator({ currentStep = 1 }) {

  return (

    <ol
      className="cv-step-indicator"
      aria-label="CV creation progress"
    >

      {steps.map((step) => {

        // Determine the current step status

        const isActive = step.id === currentStep
        const isCompleted = step.id < currentStep

        const stepStatus = isActive
          ? 'active'
          : isCompleted
            ? 'completed'
            : 'pending'


        return (

          <li
            key={step.id}
            className={`cv-step-item ${stepStatus}`}
            aria-current={isActive ? 'step' : undefined}
          >

            {/* STEP NUMBER OR COMPLETION ICON */}

            <span className="cv-step-circle">

              {isCompleted ? (

                <Check
                  size={18}
                  strokeWidth={2.5}
                  aria-label="Completed"
                />

              ) : (

                step.id

              )}

            </span>


            {/* STEP LABEL */}

            <span className="cv-step-label">
              {step.label}
            </span>


            {/* CONNECTING LINE */}

            {step.id !== steps.length && (

              <span
                className="cv-step-connector"
                aria-hidden="true"
              />

            )}

          </li>

        )

      })}

    </ol>

  )

}

export default CVStepIndicator