// ==========================================
// PROJECT: AI CAREER
// COMPONENT: Delete Account
// PURPOSE: Multilingual account deletion
// ==========================================

// Import React tools
import { useState } from 'react'

// Import translation tools

// Import icons
import {
  Trash2,
  TriangleAlert,
  ShieldAlert
} from 'lucide-react'


// ==========================================
// 01. ACCOUNT DELETION CONFIGURATION
// ==========================================

const CONFIRMATION_WORD = 'DELETE'

const deletionItems = [

  {
    id: 'profile',
    label: 'Personal profile and profile photo'
  },

  {
    id: 'assessments',
    label: 'Career assessments and recommendations'
  },

  {
    id: 'skills',
    label: 'Skills and learning progress'
  },

  {
    id: 'roadmaps',
    label: 'Career roadmaps and saved goals'
  },

  {
    id: 'resumes',
    label: 'Saved resumes and preferences'
  }

]


// ==========================================
// 02. DELETE ACCOUNT COMPONENT
// ==========================================

function DeleteAccount() {

  // Translation tools

  // Component states

  const [showConfirmation, setShowConfirmation] = useState(false)

  const [confirmationText, setConfirmationText] = useState('')


  // Validate confirmation text

  const isConfirmed =
    confirmationText === CONFIRMATION_WORD


  // 03. CANCEL ACCOUNT DELETION

  function handleCancel() {

    setShowConfirmation(false)
    setConfirmationText('')

  }


  // 04. DELETE ACCOUNT INTERFACE

  return (

    <section className="settings-card">

      {/* Section heading */}

      <div className="settings-card-header">

        <div className="settings-card-icon danger">
          <Trash2 size={24} />
        </div>

        <div>

          <h2>{"Delete Account"}</h2>

          <p>
            {"Permanently remove your account and personal data."}
          </p>

        </div>

      </div>


      <div className="settings-divider" />


      {/* Warning message */}

      <div className="settings-danger-notice">

        <TriangleAlert size={24} />

        <div>

          <h3>
            {"This action cannot be undone."}
          </h3>

          <p>
            {"Deleting your account will permanently remove your personal information and associated career data."}
          </p>

        </div>

      </div>


      {/* Account deletion consequences */}

      <div className="settings-delete-information">

        <h3>
          {"What will be deleted?"}
        </h3>

        <ul>

          {deletionItems.map(item => (

            <li key={item.id}>

              {item.label}

            </li>

          ))}

        </ul>

      </div>


      {/* Open confirmation */}

      {!showConfirmation && (

        <button
          type="button"
          className="settings-delete-button"
          onClick={() => setShowConfirmation(true)}
        >

          <Trash2 size={18} />

          {"Delete My Account"}

        </button>

      )}


      {/* 05. CONFIRMATION SECTION */}

      {showConfirmation && (

        <div className="settings-delete-confirmation">

          <div className="settings-confirmation-heading">

            <ShieldAlert size={24} />

            <h3>
              {"Confirm Account Deletion"}
            </h3>

          </div>

          <p>

            {`To confirm your request, type ${CONFIRMATION_WORD} below.`}

          </p>

          <label htmlFor="delete-confirmation">

            {"Confirmation"}

          </label>

          <input
            id="delete-confirmation"
            type="text"
            value={confirmationText}
            onChange={event =>
              setConfirmationText(event.target.value)
            }
            placeholder={`Type ${CONFIRMATION_WORD}`}
            autoComplete="off"
            spellCheck={false}
          />


          {/* Confirmation actions */}

          <div className="settings-confirmation-actions">

            <button
              type="button"
              className="settings-cancel-button"
              onClick={handleCancel}
            >

              {"Cancel"}

            </button>

            <button
              type="button"
              className="settings-delete-button"
              disabled
              title={"Available after backend integration"}
            >

              {"Permanently Delete"}

            </button>

          </div>


          {/* Confirmation feedback */}

          {isConfirmed && (

            <p
              className="settings-privacy-disclaimer"
              role="status"
            >

              {"Confirmation received. Account deletion is not available in preview mode."}

            </p>

          )}

        </div>

      )}


      {/* Backend implementation notice */}

      <p className="settings-privacy-disclaimer">

        {"Account deletion will be available after secure backend integration."}

      </p>

    </section>

  )

}

export default DeleteAccount