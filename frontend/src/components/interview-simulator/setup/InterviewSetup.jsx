import SetupFrame from './SetupFrame'
import SetupSettings, { ExperienceLevel } from './SetupSettings'
import SetupSummary from './SetupSummary'
import { JobRoleField, SetupTagsField } from './SetupSearchFields'

export default function InterviewSetup({ heading, roleOptions, focus, config }) {
  return (
    <SetupFrame heading={heading} config={config}>
      {({ draft, errors, updateDraft, starting, startError, configuration }) => (
        <>
          <div className="interview-setup-panel interview-setup-fields">
            <JobRoleField role={draft.role} options={roleOptions} error={errors.role}
              onChange={value => updateDraft('role', value)} />
            <ExperienceLevel draft={draft} errors={errors} onChange={updateDraft} />
            <SetupTagsField {...focus} entries={draft[focus.field]} error={errors[focus.field]}
              onChange={value => updateDraft(focus.field, value)} />
            <SetupSettings draft={draft} errors={errors} onChange={updateDraft} />
          </div>
          <SetupSummary configuration={configuration} starting={starting} error={startError}
            details={[[focus.label, configuration[focus.field].join(', ') || 'None selected']]} />
        </>
      )}
    </SetupFrame>
  )
}
