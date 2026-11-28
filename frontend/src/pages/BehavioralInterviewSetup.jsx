import InterviewSetup from '../components/interview-simulator/setup/InterviewSetup'
import { behavioralTopics, interviewProfessions } from '../components/interview-simulator/setup/suggestions'
import { behavioralConfig } from '../services/interviewSetupConfigs'

const focus = {
  field: 'topics',
  label: 'Behavioral topics',
  entryLabel: 'topic',
  options: behavioralTopics
}

export default function BehavioralInterviewSetup() {
  return <InterviewSetup heading="Behavioral Interview Setup" roleOptions={interviewProfessions} focus={focus} config={behavioralConfig} />
}
