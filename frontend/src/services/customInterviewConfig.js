import {
  buildInterviewConfiguration, cleanEntry, createInterviewDraftStore, entryKey,
  restoreEntries, validateInterviewSettings
} from './interviewSetupConfig.js'

export const customInterviewTypes = [
  { id: 'technical', label: 'Technical Interview', field: 'skills', focusLabel: 'Technical skills', entryLabel: 'skill' },
  { id: 'behavioral', label: 'Behavioral Interview', field: 'behavioralSkills', focusLabel: 'Behavioral skills', entryLabel: 'skill' },
  { id: 'general', label: 'General Interview', field: 'generalTopics', focusLabel: 'General topics', entryLabel: 'topic' }
]

export const emptyQuestionEditor = { text: '', original: null }
const emptyBank = { questions: [], editor: emptyQuestionEditor }
const optionalFields = ['companyName', 'jobDescription', 'instructions']

function activeTypes(selected) {
  return customInterviewTypes.filter(type => selected.includes(type.id))
}

const store = createInterviewDraftStore('custom', {
  types: [],
  skills: [],
  behavioralSkills: [],
  generalTopics: [],
  companyName: '',
  jobDescription: '',
  instructions: '',
  questionBank: emptyBank
}, saved => {
  const questions = restoreEntries(saved.questionBank?.questions)
  const editor = saved.questionBank?.editor
  return {
    types: activeTypes(Array.isArray(saved.types) ? saved.types : []).map(type => type.id),
    ...Object.fromEntries(customInterviewTypes.map(({ field }) => [field, restoreEntries(saved[field])])),
    ...Object.fromEntries(optionalFields.map(field => [field, typeof saved[field] === 'string' ? saved[field] : ''])),
    questionBank: {
      questions,
      editor: {
        text: typeof editor?.text === 'string' ? editor.text : '',
        original: questions.includes(editor?.original) ? editor.original : null
      }
    }
  }
})

export function validateCustomQuestion(text, questions, original) {
  const key = entryKey(text)
  if (!key) return 'Enter a question.'
  if (questions.some(question => question !== original && entryKey(question) === key)) {
    return 'This question is already on the list.'
  }
  return ''
}

export function customQuestionLimitError(count, total) {
  return count > total
    ? 'Custom questions cannot exceed the selected total. Remove a question or increase the total.'
    : ''
}

function validateDraft(draft) {
  const errors = validateInterviewSettings(draft)
  const types = activeTypes(draft.types)
  if (!types.length) errors.types = 'Select at least one interview type.'
  for (const { field, id, entryLabel } of types) {
    if (!draft[field].length) errors[field] = `Add at least one ${id} ${entryLabel}.`
  }

  const { questions, editor } = draft.questionBank
  const limitError = customQuestionLimitError(questions.length, draft.questionCount)
  if (limitError) {
    errors.questionBank = limitError
  } else if (editor.original !== null || cleanEntry(editor.text)) {
    errors.questionBank = 'Add, save, or clear the question you are editing before starting.'
  }
  return errors
}

function buildConfiguration(draft) {
  const types = activeTypes(draft.types)
  return {
    ...buildInterviewConfiguration('custom', draft),
    types: types.map(type => type.id),
    companyName: cleanEntry(draft.companyName),
    jobDescription: draft.jobDescription.trim(),
    instructions: draft.instructions.trim(),
    ...Object.fromEntries(types.map(({ field }) => [field, draft[field].map(cleanEntry)])),
    customQuestions: draft.questionBank.questions.map(cleanEntry)
  }
}

export const customInterviewConfig = { ...store, validateDraft, buildConfiguration }
