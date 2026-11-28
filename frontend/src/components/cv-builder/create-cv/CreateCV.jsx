// ==========================================

// PROJECT: AI CAREER

// COMPONENT: Create CV

// PURPOSE: Manage the complete CV creation flow

// ==========================================

// Import React tools

import { useMemo, useRef, useState } from 'react'
import useCVExitProtection from './useCVExitProtection'

import { isValidPhoneNumber, isSupportedCountry, getCountryCallingCode } from 'react-phone-number-input'

// Import CV creation components

import CreateCVHeader from './CreateCVHeader'

import CVStepIndicator from './CVStepIndicator'

import BasicInformation from './BasicInformation'

import WorkExperience from './WorkExperience'

import Education from './Education'

import Skills from './Skills'

import CVDesignStudio from './studio/CVDesignStudio'
import { DEFAULT_TEMPLATE_ID, getTemplateById } from './studio/templates/templateCatalog'

import CVFormNavigation from './CVFormNavigation'

// Import styles

import '../../../styles/create-cv.css'

// ==========================================

// 01. INITIAL FORM DATA

// ==========================================
function getInitialData(profile = {}) {

  return {

    basicInformation: {

      fullName: [
        profile.firstName,
        profile.lastName
      ].filter(Boolean).join(' '),

      email: profile.email || '',
      phone: '',
      phoneCountry: '',

      location: [
        profile.city,
        profile.country
      ].filter(Boolean).join(', '),

      jobTitle: '',
      careerLevel: '',
      targetCountry: '',
      summary: ''

    },

    workExperience: [],

    education: [],

    skills: {
      technicalSkills: [],
      softSkills: [],
      languages: []
    },

    template: DEFAULT_TEMPLATE_ID,
    design: {}

  }

}

function restoreCVData(profile, record) {
  const defaults = getInitialData(profile)
  const stored = record?.data
  if (!stored) return defaults

  return {
    ...defaults,
    ...stored,
    basicInformation: { ...defaults.basicInformation, ...stored.basicInformation },
    skills: { ...defaults.skills, ...stored.skills },
    template: stored.template || record.templateId || DEFAULT_TEMPLATE_ID
  }
}

// ==========================================

// 02. MAIN CREATE CV COMPONENT

// ==========================================

function CreateCV({

   onBack,

   onSave,

   record,

   profile = {}

}) {

   const [currentStep, setCurrentStep] = useState(() => record ? Math.max(1, Math.min(5, Number(record.step) || (record.status === 'draft' ? 1 : 5))) : 1)

   const [cvData, setCVData] = useState(

     () => restoreCVData(profile, record)

   )

   const [errors, setErrors] = useState({})

   const [saving, setSaving] = useState(null)
   const [title, setTitle] = useState(record?.title ?? '')
   const [sectionEditing, setSectionEditing] = useState(false)
   const [photoPending, setPhotoPending] = useState(false)
   const identity = useRef(record ? { id: record.id, createdAt: record.createdAt } : null)
   const saveLock = useRef(false)
   const initialSnapshot = useRef(null)
   const photoSource = cvData.design?.photo?.src
   // Compare the immutable photo payload separately to avoid repeatedly
   // serializing a potentially multi-megabyte base64 string on field edits.
   const snapshot = useMemo(() => {
     const design = cvData.design?.photo
       ? { ...cvData.design, photo: { ...cvData.design.photo, src: undefined } }
       : cvData.design
     return JSON.stringify([{ ...cvData, design }, title])
   }, [cvData, title])
   if (initialSnapshot.current === null) initialSnapshot.current = { snapshot, photoSource }
   const dirty = snapshot !== initialSnapshot.current.snapshot || photoSource !== initialSnapshot.current.photoSource
   const pendingStudioChange = sectionEditing || photoPending
   const canExit = useCVExitProtection(dirty || pendingStudioChange, Boolean(saving))
   const isUpdate = Boolean(record && record.status !== 'draft')
   const suggestedTitle = cvData.basicInformation.jobTitle.trim()
     ? `${cvData.basicInformation.jobTitle.trim()} CV`
     : 'Untitled CV'


   const [creationError, setCreationError] = useState('')

   const TOTAL_STEPS = 5

   // Determine whether the current optional step is empty

const canSkipCurrentStep =
  (currentStep === 2 &&
    cvData.workExperience.length === 0) ||

  (currentStep === 3 &&
    cvData.education.length === 0) ||

  (currentStep === 4 &&
    cvData.skills.technicalSkills.length === 0 &&
    cvData.skills.softSkills.length === 0 &&
    cvData.skills.languages.length === 0)

   // ==========================================

   // 03. UPDATE BASIC INFORMATION

   // ==========================================

   function handleBasicInformationChange(field, value) {

     handleStudioDataChange(previous => ({

       ...previous,

       basicInformation: {

         ...previous.basicInformation,

         [field]: value

       }

     }))

     setErrors(previous => ({

       ...previous,

       [field]: undefined

     }))

   }

   // ==========================================

   // 04. UPDATE WORK EXPERIENCE

   // ==========================================

   function handleWorkExperienceChange(experiences) {

     setCVData(previous => ({

       ...previous,

       workExperience: experiences

     }))

     setErrors({})

   }

   // ==========================================

   // 05. UPDATE EDUCATION

   // ==========================================

   function handleEducationChange(education) {

     setCVData(previous => ({

       ...previous,

       education

     }))

     setErrors({})

   }

   // ==========================================

   // 06. UPDATE SKILLS

   // ==========================================

   function handleSkillsChange(field, value) {

     setCVData(previous => ({

       ...previous,

       skills: {

         ...previous.skills,

         [field]: value

       }

     }))

     setErrors({})

   }

   // ==========================================

   // 07. UPDATE TEMPLATE

   // ==========================================

   function handleDesignChange(update) {
     setCVData(previous => ({
       ...previous,
       design: update(previous.design ?? {})
     }))
   }

   function handleStudioDataChange(update) {
     setCVData(previous => {
       const next = update(previous)
       // An explicit Basic Information country change supersedes a regional target.
       if (previous.international?.regionalFormat &&
           next.international === previous.international &&
           next.basicInformation.targetCountry !== previous.basicInformation.targetCountry) {
         return { ...next, international: { ...next.international, regionalFormat: null } }
       }
       return next
     })
   }

   function handleTemplateChange(template) {

     setCVData(previous => ({

       ...previous,

       template

     }))

     setErrors({})

     setCreationError('')

   }

   // ==========================================

   // 08. VALIDATE BASIC INFORMATION

   // ==========================================

   function validateBasicInformation(draft = cvData) {

     const data = draft.basicInformation

     const validationErrors = {}

     const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

     if (!data.fullName.trim()) {

       validationErrors.fullName =

         'Please enter your full name.'

     }

     if (!data.email.trim()) {

       validationErrors.email =

         'Please enter your email address.'

     } else if (!emailPattern.test(data.email.trim())) {

       validationErrors.email =

         'Please enter a valid email address.'

     }

     if (!data.jobTitle.trim()) {

       validationErrors.jobTitle =

         'Please enter your target position.'

     }

     if (!data.careerLevel) {

       validationErrors.careerLevel =

         'Please select your career level.'

     }

     if (!data.location.trim()) {

       validationErrors.location =

         'Please enter your location.'

     }

     // An empty number or a calling code alone is optional.
    const callingCode = data.phoneCountry && isSupportedCountry(data.phoneCountry)
      ? `+${getCountryCallingCode(data.phoneCountry)}`
      : ''
    if (data.phone && data.phone !== callingCode && !isValidPhoneNumber(data.phone)) {
      validationErrors.phone = 'Please enter a valid phone number.'
    }

    return validationErrors

   }



// ==========================================
// DATE VALIDATION HELPERS
// ==========================================

// Validate the YYYY-MM date format

function isValidMonthYear(value) {

  if (typeof value !== 'string') return false

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
    return false
  }

  const year = Number(value.split('-')[0])

  return year >= 1950

}


// Get the current month in YYYY-MM format

function getCurrentMonth() {

  const now = new Date()

  const year = now.getFullYear()

  const month = String(
    now.getMonth() + 1
  ).padStart(2, '0')

  return `${year}-${month}`

}


   // ==========================================

   // 09. VALIDATE WORK EXPERIENCE

   // ==========================================


function validateWorkExperience(draft = cvData) {

  const validationErrors = {}

  const currentMonth = getCurrentMonth()

  draft.workExperience.forEach(experience => {

    if (!experience.jobTitle.trim()) {

      validationErrors[experience.id] =
        'Please enter a job title.'

    } else if (!experience.company.trim()) {

      validationErrors[experience.id] =
        'Please enter the company name.'

    } else if (!isValidMonthYear(experience.startDate)) {

      validationErrors[experience.id] =
        'Please select a valid start month and year.'

    } else if (experience.startDate > currentMonth) {

      validationErrors[experience.id] =
        'Start date cannot be in the future.'

    } else if (
      !experience.currentlyWorking &&
      !isValidMonthYear(experience.endDate)
    ) {

      validationErrors[experience.id] =
        'Please select a valid end month and year.'

    } else if (
      !experience.currentlyWorking &&
      experience.endDate > currentMonth
    ) {

      validationErrors[experience.id] =
        'End date cannot be in the future.'

    } else if (
      !experience.currentlyWorking &&
      experience.endDate < experience.startDate
    ) {

      validationErrors[experience.id] =
        'End date cannot be before start date.'

    }

  })

  return validationErrors

}


   // ==========================================

   // 10. VALIDATE EDUCATION

   // ==========================================



function validateEducation(draft = cvData) {

  const validationErrors = {}

  const currentMonth = getCurrentMonth()

  const maxGraduationYear =
    new Date().getFullYear() + 10

  draft.education.forEach(item => {

    if (!item.institution.trim()) {

      validationErrors[item.id] =
        'Please enter the institution name.'

    } else if (!item.degree) {

      validationErrors[item.id] =
        'Please select a degree.'

    } else if (!isValidMonthYear(item.startDate)) {

      validationErrors[item.id] =
        'Please select a valid start month and year.'

    } else if (item.startDate > currentMonth) {

      validationErrors[item.id] =
        'Start date cannot be in the future.'

    } else if (
      !item.currentlyStudying &&
      !isValidMonthYear(item.endDate)
    ) {

      validationErrors[item.id] =
        'Please select a valid end month and year.'

    } else if (
      item.endDate &&
      !isValidMonthYear(item.endDate)
    ) {

      validationErrors[item.id] =
        'Please select a complete month and year.'

    } else if (
      !item.currentlyStudying &&
      item.endDate > currentMonth
    ) {

      validationErrors[item.id] =
        'End date cannot be in the future.'

    } else if (
      item.currentlyStudying &&
      item.endDate &&
      Number(item.endDate.split('-')[0]) >
        maxGraduationYear
    ) {

      validationErrors[item.id] =
        'Expected graduation date exceeds the allowed range.'

    } else if (
      item.endDate &&
      item.endDate < item.startDate
    ) {

      validationErrors[item.id] =
        'End date cannot be before start date.'

    }

  })

  return validationErrors

}


   // ==========================================

   // 11. VALIDATE SKILLS AND LANGUAGES

   // ==========================================

   function validateSkills(draft = cvData) {

     const validationErrors = {}

     const addedLanguages = new Set()

     draft.skills.languages.forEach(language => {

       const name = language.name.trim().toLowerCase()

       if (!name) {

         validationErrors[language.id] =

           'Please enter a language.'

       } else if (!language.level) {

         validationErrors[language.id] =

           'Please select a proficiency level.'

       } else if (addedLanguages.has(name)) {

         validationErrors[language.id] =

           'This language has already been added.'

       }

       if (name) {

         addedLanguages.add(name)

       }

     })

     return validationErrors

   }

   // ==========================================

   // 12. VALIDATE CURRENT STEP

   // ==========================================

   function validateStep(step, draft = cvData) {

     switch (step) {

       case 1:

         return validateBasicInformation(draft)

       case 2:

         return validateWorkExperience(draft)

       case 3:

         return validateEducation(draft)

       case 4:

         return validateSkills(draft)

       case 5:

         return getTemplateById(draft.template)

           ? {}

           : { template: 'Please select a template.' }

       default:

         return {}

     }

   }

   // ==========================================

   // 13. NEXT STEP

   // ==========================================

   function handleNext() {

     const validationErrors = validateStep(currentStep)

     setErrors(validationErrors)

     if (Object.keys(validationErrors).length > 0) {

       return

     }

     setCurrentStep(previous =>

       Math.min(previous + 1, TOTAL_STEPS)

     )

     window.scrollTo({

       top: 0,

       behavior: 'smooth'

     })

   }

   // ==========================================

   // 14. PREVIOUS STEP

   // ==========================================

   function handleBack() {

     if (sectionEditing && !window.confirm('Discard the unconfirmed section edit?')) return
     if (photoPending && !window.confirm('Leave before the photo finishes loading?')) return
     setSectionEditing(false)

     if (currentStep === 1) {

       handleExit()

       return

     }

     setErrors({})

     setCreationError('')

     setCurrentStep(previous =>

       Math.max(previous - 1, 1)

     )

     window.scrollTo({

       top: 0,

       behavior: 'smooth'

     })

   }

   // ==========================================

   // 15. EXIT CV CREATION

   // ==========================================

   function handleExit() {
     if (canExit()) onBack?.()
   }

   async function saveCV(status) {
     if (saveLock.current || pendingStudioChange) return
     setCreationError('')

     if (status === 'completed') {
       for (let step = 1; step <= TOTAL_STEPS; step++) {
         const validationErrors = validateStep(step)
         if (Object.keys(validationErrors).length > 0) {
           setCurrentStep(step)
           setErrors(validationErrors)
           window.scrollTo(0, 0)
           return
         }
       }
     }

     saveLock.current = true
     setSaving(status)
     try {
       const timestamp = new Date().toISOString()
       identity.current ??= { id: crypto.randomUUID(), createdAt: timestamp }
       const template = getTemplateById(cvData.template)
       const data = status === 'completed' && !isValidPhoneNumber(cvData.basicInformation.phone || '')
         ? { ...cvData, basicInformation: { ...cvData.basicInformation, phone: '' } }
         : cvData

       await onSave({
         ...record,
         ...identity.current,
         title: title.trim() || suggestedTitle,
         template: template?.name ?? record?.template ?? 'Template unavailable',
         templateId: cvData.template,
         previewUrl: record?.previewUrl ?? null,
         updatedAt: timestamp,
         status,
         step: status === 'draft' ? currentStep : TOTAL_STEPS,
         data
       })
     } catch {
       setCreationError(status === 'draft'
         ? 'Your draft could not be saved. Check that browser storage is available and try again.'
         : 'Your CV could not be saved. Check that browser storage is available and try again.')
     } finally {
       saveLock.current = false
       setSaving(null)
     }
   }

   // ==========================================

   // 17. RENDER CURRENT STEP

   // ==========================================

   function renderCurrentStep() {

     switch (currentStep) {

       case 1:

         return (

           <BasicInformation

             data={cvData.basicInformation}

             onChange={handleBasicInformationChange}

             errors={errors}

           />

         )

       case 2:

         return (

           <WorkExperience

             experiences={cvData.workExperience}

             onChange={handleWorkExperienceChange}

             errors={errors}

           />

         )

       case 3:

         return (

           <Education

             education={cvData.education}

             onChange={handleEducationChange}

             errors={errors}

           />

         )

       case 4:

         return (

           <Skills

             data={cvData.skills}

             onChange={handleSkillsChange}

             errors={errors}

           />

         )

       case 5:

         return (

           <CVDesignStudio

             cvData={cvData}

             exportTitle={title.trim() || suggestedTitle}

             onChange={handleTemplateChange}

             onDesignChange={handleDesignChange}

             onDataChange={handleStudioDataChange}

             validateStep={validateStep}

             onSectionEditingChange={setSectionEditing}

             sectionEditing={sectionEditing}

             photoPending={photoPending}

             onPhotoPendingChange={setPhotoPending}

           />

         )

       default:

         return null

     }

   }

   // ==========================================

   // 18. MAIN INTERFACE

   // ==========================================

   return (

     <div className="create-cv-page">

       {/* PAGE HEADER */}

       <CreateCVHeader

         onBack={handleExit}
         mode={isUpdate ? 'edit' : record ? 'draft' : 'create'}

       />

       {/* MAIN FORM CONTAINER */}

       <div className="create-cv-container">

         {/* STEP INDICATOR */}

         <CVStepIndicator

           currentStep={currentStep}

         />

         {/* CURRENT FORM STEP */}

         <div className="create-cv-form-content" inert={Boolean(saving)}>

           {renderCurrentStep()}

         </div>

         {/* TEMPLATE VALIDATION ERROR */}

         {errors.template && (

           <p className="cv-field-error" role="alert">

             {errors.template}

           </p>

         )}

         {/* CREATION ERROR */}

         {creationError && (

           <p className="cv-field-error" role="alert">

             {creationError}

           </p>

         )}

         <div className="cv-save-settings">
           <label className="cv-gallery-field">
             <span>CV name</span>
             <input value={title} maxLength={120} onChange={event => setTitle(event.target.value)}
               placeholder={suggestedTitle}
               disabled={Boolean(saving)} />
           </label>
           {sectionEditing && <p role="status">Save or cancel the section edit before saving your CV.</p>}
           {photoPending && <p role="status">Wait for the photo to finish loading before saving your CV.</p>}
         </div>

         <CVFormNavigation
           currentStep={currentStep}
           onBack={handleBack}
           onNext={handleNext}
           onDraft={isUpdate ? undefined : () => saveCV('draft')}
           onCreate={() => saveCV('completed')}
           createLabel={isUpdate ? 'Save Changes' : 'Create CV'}
           saving={saving}
           blocked={pendingStudioChange}
           canSkip={canSkipCurrentStep}
         />

       </div>

     </div>

   )

}

export default CreateCV
