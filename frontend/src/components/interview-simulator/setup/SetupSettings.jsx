import SetupOptions from './SetupOptions'
import {
  difficultyOptions, durationOptions, experienceOptions, languageOptions, questionOptions
} from '../../../services/interviewSetupConfig'

const interviewOptions = [
  ['difficulty', 'Interview difficulty', difficultyOptions],
  ['questionCount', 'Number of questions', questionOptions],
  ['durationMinutes', 'Interview duration', durationOptions],
  ['language', 'Interview language', languageOptions]
]

export function ExperienceLevel({ draft, errors, onChange }) {
  return (
    <SetupOptions name="experience" title="Experience level" value={draft.experience}
      options={experienceOptions} error={errors.experience} onChange={onChange} />
  )
}

export default function SetupSettings({ draft, errors, onChange }) {
  return interviewOptions.map(([name, label, options]) => (
    <SetupOptions key={name} name={name} title={label} value={draft[name]} options={options}
      error={errors[name]} onChange={onChange} />
  ))
}
