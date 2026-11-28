import { defaultInterviewWorkspace, getInterviewWorkspace } from './interviewSessionDatabase.js'

export const experienceOptions = [
  ['student', 'Student / Internship'],
  ['junior', 'Junior'],
  ['mid-level', 'Mid-level'],
  ['senior', 'Senior']
]
export const difficultyOptions = [['easy', 'Easy'], ['medium', 'Medium'], ['hard', 'Hard']]
export const questionOptions = [5, 10, 15, 20].map(count => [count, `${count} questions`])
export const durationOptions = [
  ...[15, 30, 45, 60].map(minutes => [minutes, `${minutes} minutes`]),
  [null, 'Unlimited']
]
export const languageOptions = [
  ['en', 'English'], ['pt', 'Portuguese'], ['zh', 'Chinese'], ['es', 'Spanish'],
  ['fr', 'French'], ['nl', 'Dutch'], ['ru', 'Russian']
]

export function optionLabel(options, value) {
  return options.find(([option]) => option === value)?.[1] ?? 'Not selected'
}

const optionFields = [
  ['experience', experienceOptions, '', 'Select an experience level.'],
  ['difficulty', difficultyOptions, 'medium', 'Select a difficulty.'],
  ['questionCount', questionOptions, 10, 'Select a question count.'],
  ['durationMinutes', durationOptions, 30, 'Select a duration.'],
  ['language', languageOptions, 'en', 'Select an interview language.']
]

export function cleanEntry(value) {
  return value.trim().replace(/\s+/g, ' ')
}

export function entryKey(value) {
  return cleanEntry(value).normalize('NFKC').toLowerCase()
}

function hasOption(options, value) {
  return options.some(([option]) => option === value)
}

export function restoreEntries(entries) {
  const unique = new Map()
  if (!Array.isArray(entries)) return []
  for (const entry of entries) {
    if (typeof entry !== 'string') continue
    const key = entryKey(entry)
    if (key && !unique.has(key)) unique.set(key, cleanEntry(entry))
  }
  return [...unique.values()]
}

export function createInterviewDraftStore(interviewType, initialFields, restoreFields) {
  const storageKey = `interview-simulator:${interviewType}-draft:v1`
  const defaults = {
    role: '',
    ...initialFields,
    ...Object.fromEntries(optionFields.map(([key, , initial]) => [key, initial]))
  }
  let latestDraft
  let latestWorkspace

  function draftWorkspace() {
    try {
      return getInterviewWorkspace()
    } catch {
      return null
    }
  }

  const keyForWorkspace = workspace => workspace === defaultInterviewWorkspace ? storageKey : `${storageKey}:${workspace}`

  function readDraft() {
    const workspace = draftWorkspace()
    if (latestDraft && latestWorkspace === workspace) return latestDraft
    if (!workspace) return defaults
    try {
      const saved = JSON.parse(sessionStorage.getItem(keyForWorkspace(workspace)))
      if (typeof saved?.role !== 'string') return defaults
      const fields = restoreFields(saved)
      if (!fields) return defaults
      const draft = { ...defaults, ...fields, role: saved.role }
      for (const [field, options] of optionFields) {
        if (hasOption(options, saved[field])) draft[field] = saved[field]
      }
      return draft
    } catch {
      return defaults
    }
  }

  function saveDraft(draft) {
    latestDraft = draft
    latestWorkspace = draftWorkspace()
    if (!latestWorkspace) return
    try {
      sessionStorage.setItem(keyForWorkspace(latestWorkspace), JSON.stringify(draft))
    } catch {
      // Route changes can still restore the in-memory draft.
    }
  }

  return { readDraft, saveDraft }
}

export function validateInterviewSettings(draft) {
  const errors = {}
  if (!cleanEntry(draft.role)) errors.role = 'Enter a job role.'
  for (const [field, options, , message] of optionFields) {
    if (!hasOption(options, draft[field])) errors[field] = message
  }
  return errors
}

export function buildInterviewConfiguration(interviewType, draft) {
  return {
    interviewType,
    format: 'text',
    role: cleanEntry(draft.role),
    experience: draft.experience,
    difficulty: draft.difficulty,
    questionCount: draft.questionCount,
    durationMinutes: draft.durationMinutes,
    language: draft.language
  }
}

export function createInterviewSetupConfig({ interviewType, focusField, focusError }) {
  const store = createInterviewDraftStore(interviewType, { [focusField]: [] }, saved => {
    const entries = saved[focusField]
    if (!Array.isArray(entries) || !entries.every(entry => typeof entry === 'string')) return null
    return { [focusField]: restoreEntries(entries) }
  })

  function validateDraft(draft) {
    const errors = validateInterviewSettings(draft)
    if (!draft[focusField].length) errors[focusField] = focusError
    return errors
  }

  function buildConfiguration(draft) {
    return {
      ...buildInterviewConfiguration(interviewType, draft),
      [focusField]: draft[focusField].map(cleanEntry)
    }
  }

  return { ...store, validateDraft, buildConfiguration }
}
