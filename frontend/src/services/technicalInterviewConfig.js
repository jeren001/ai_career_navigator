import { createInterviewSetupConfig } from './interviewSetupConfig.js'

export const technicalConfig = createInterviewSetupConfig({
  interviewType: 'technical',
  focusField: 'skills',
  focusError: 'Add at least one technical skill.'
})
