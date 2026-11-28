import InterviewSetup from '../components/interview-simulator/setup/InterviewSetup'
import { professions, technicalSkills } from '../components/interview-simulator/setup/suggestions'
import { technicalConfig } from '../services/technicalInterviewConfig'

const focus = {
  field: 'skills',
  label: 'Technical skills',
  entryLabel: 'skill',
  options: technicalSkills
}

export default function TechnicalInterviewSetup() {
  return <InterviewSetup heading="Technical Interview Setup" roleOptions={professions} focus={focus} config={technicalConfig} />
}
