import { customInterviewConfig, customInterviewTypes, emptyQuestionEditor } from './customInterviewConfig.js'
import { createInterviewSetupConfig } from './interviewSetupConfig.js'
import { technicalConfig } from './technicalInterviewConfig.js'

export const behavioralConfig = createInterviewSetupConfig({
  interviewType: 'behavioral', focusField: 'topics', focusError: 'Add at least one behavioral topic.'
})
export const generalConfig = createInterviewSetupConfig({
  interviewType: 'general', focusField: 'topics', focusError: 'Add at least one interview topic.'
})

const configs = {
  technical: technicalConfig, behavioral: behavioralConfig,
  general: generalConfig, custom: customInterviewConfig
}

export function restoreInterviewSetup(configuration, practiceFocus) {
  const { interviewType, role, experience, difficulty, questionCount, durationMinutes, language } = configuration
  const draft = { role, experience, difficulty, questionCount, durationMinutes, language }
  if (interviewType === 'custom') {
    const { companyName, jobDescription, instructions, customQuestions } = configuration
    const types = practiceFocus ? practiceFocus.map(item => item.type) : configuration.types
    Object.assign(draft, {
      types, companyName, jobDescription, instructions,
      questionBank: { questions: practiceFocus ? [] : customQuestions, editor: emptyQuestionEditor }
    })
    for (const { id, field } of customInterviewTypes) {
      draft[field] = practiceFocus ? practiceFocus.find(item => item.type === id)?.entries ?? [] : configuration[field] ?? []
    }
  } else {
    const field = interviewType === 'technical' ? 'skills' : 'topics'
    draft[field] = practiceFocus ? practiceFocus[0].entries : configuration[field]
  }
  configs[interviewType].saveDraft(draft)
  return `/interview-simulator/${interviewType}`
}
