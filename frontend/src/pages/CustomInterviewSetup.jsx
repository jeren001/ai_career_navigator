import CustomQuestions from '../components/interview-simulator/setup/CustomQuestions'
import SetupFrame from '../components/interview-simulator/setup/SetupFrame'
import SetupSettings, { ExperienceLevel } from '../components/interview-simulator/setup/SetupSettings'
import SetupSummary from '../components/interview-simulator/setup/SetupSummary'
import { JobRoleField, SetupTagsField } from '../components/interview-simulator/setup/SetupSearchFields'
import {
  behavioralTopics, generalTopics, interviewProfessions, technicalSkills
} from '../components/interview-simulator/setup/suggestions'
import { customInterviewConfig, customInterviewTypes } from '../services/customInterviewConfig'
import '../styles/custom-interview-setup.css'

const suggestions = { technical: technicalSkills, behavioral: behavioralTopics, general: generalTopics }

function CustomInterviewFields({ draft, errors, updateDraft }) {
  const selected = customInterviewTypes.filter(type => draft.types.includes(type.id))

  function toggleType(id) {
    updateDraft('types', draft.types.includes(id) ? draft.types.filter(type => type !== id) : [...draft.types, id])
  }

  return (
    <div className="custom-interview-fields interview-setup-fields">
      <section className="interview-setup-panel interview-setup-fields" aria-labelledby="custom-job-title">
        <h3 id="custom-job-title">Job information</h3>
        <JobRoleField role={draft.role} options={interviewProfessions} error={errors.role}
          onChange={value => updateDraft('role', value)} />
        <div className="interview-setup-field">
          <label htmlFor="custom-company">Company name <span className="interview-setup-hint">(optional)</span></label>
          <input id="custom-company" type="text" value={draft.companyName}
            onChange={event => updateDraft('companyName', event.target.value)} />
        </div>
        <div className="interview-setup-field">
          <label htmlFor="custom-job-description">Job description <span className="interview-setup-hint">(optional)</span></label>
          <textarea id="custom-job-description" rows={4} value={draft.jobDescription}
            onChange={event => updateDraft('jobDescription', event.target.value)} />
        </div>
        <ExperienceLevel draft={draft} errors={errors} onChange={updateDraft} />
      </section>

      <section className="interview-setup-panel interview-setup-fields" aria-label="Interview types and focus areas">
        <fieldset className="interview-setup-options">
          <legend>Interview types</legend>
          <div className="interview-setup-option-grid">
            {customInterviewTypes.map(({ id, label }) => (
              <label key={id} className="interview-setup-option">
                <input type="checkbox" name="types" value={id} checked={draft.types.includes(id)}
                  aria-invalid={errors.types ? true : undefined} aria-describedby={errors.types ? 'custom-types-error' : undefined}
                  onChange={() => toggleType(id)} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {errors.types && <p className="interview-setup-error" id="custom-types-error">{errors.types}</p>}
        </fieldset>

        {selected.map(({ id, field, focusLabel, entryLabel }) => (
          <SetupTagsField key={id} field={field} label={focusLabel} entryLabel={entryLabel}
            options={suggestions[id]} entries={draft[field]} error={errors[field]}
            onChange={value => updateDraft(field, value)} />
        ))}
      </section>

      <CustomQuestions bank={draft.questionBank} total={draft.questionCount} error={errors.questionBank}
        onChange={value => updateDraft('questionBank', value)} />

      <section className="interview-setup-panel interview-setup-fields" aria-labelledby="custom-settings-title">
        <h3 id="custom-settings-title">Interview settings</h3>
        <SetupSettings draft={draft} errors={errors} onChange={updateDraft} />
        <div className="interview-setup-field">
          <label htmlFor="custom-instructions">Additional instructions <span className="interview-setup-hint">(optional)</span></label>
          <textarea id="custom-instructions" rows={3} value={draft.instructions}
            placeholder="Tell the AI how to personalize your interview..."
            onChange={event => updateDraft('instructions', event.target.value)} />
        </div>
      </section>
    </div>
  )
}

export default function CustomInterviewSetup() {
  return (
    <SetupFrame heading="Custom Interview Setup" config={customInterviewConfig}>
      {({ draft, errors, updateDraft, starting, startError, configuration }) => {
        const selected = customInterviewTypes.filter(type => configuration.types.includes(type.id))
        const details = [
          ['Interview types', selected.map(type => type.label).join(', ') || 'None selected'],
          ...selected.map(({ field, focusLabel }) => [focusLabel, configuration[field].join(', ') || 'None selected']),
          ['Custom questions', configuration.customQuestions.length]
        ]
        return (
          <>
            <CustomInterviewFields draft={draft} errors={errors} updateDraft={updateDraft} />
            <SetupSummary configuration={configuration} details={details} questionLabel="Total questions" starting={starting} error={startError} />
          </>
        )
      }}
    </SetupFrame>
  )
}
