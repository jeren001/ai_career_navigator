import InterviewSetup from '../components/interview-simulator/setup/InterviewSetup'
import { generalTopics, interviewProfessions } from '../components/interview-simulator/setup/suggestions'
import { generalConfig } from '../services/interviewSetupConfigs'

const focus = {
  field: 'topics',
  label: 'Interview topics',
  entryLabel: 'topic',
  options: generalTopics
}

export default function GeneralInterviewSetup() {
  return <InterviewSetup heading="General Interview Setup" roleOptions={interviewProfessions} focus={focus} config={generalConfig} />
}
