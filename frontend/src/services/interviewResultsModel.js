import { customInterviewTypes } from './customInterviewConfig.js'
import { completionLabels, interviewTypeLabels } from './interviewSessionModel.js'
import { difficultyOptions, durationOptions, experienceOptions, languageOptions, optionLabel } from './interviewSetupConfig.js'

const categoryLists = {
  technical: ['Answer Accuracy', 'Technical Knowledge', 'Problem Solving', 'Answer Relevance', 'Communication', 'Depth of Knowledge'],
  behavioral: ['Communication', 'Answer Structure', 'Situational Awareness', 'Problem Solving', 'Professional Judgment', 'Relevance of Examples'],
  general: ['Communication', 'Answer Clarity', 'Answer Relevance', 'Professional Awareness', 'Motivation', 'Answer Structure']
}

export function evaluationCategories(configuration) {
  const types = configuration.interviewType === 'custom' ? configuration.types : [configuration.interviewType]
  return [...new Set(types.flatMap(type => categoryLists[type]))]
}

export function countAnswerWords(text) {
  return text.trim() ? text.trim().split(/\s+/u).length : 0
}

export function formatInterviewDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds / 60) % 60
  const pad = value => String(value).padStart(2, '0')
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds % 60)}` : `${pad(minutes)}:${pad(seconds % 60)}`
}

export function buildInterviewResults(session) {
  const { configuration, answers, skipped, questions, unfinishedAnswers } = session
  const submitted = new Map(answers.map(answer => [answer.questionId, answer.text]))
  const skippedIds = new Set(skipped.map(item => item.questionId))
  const review = questions.map((question, index) => {
    const answer = submitted.get(question.id)
    const draft = Object.hasOwn(unfinishedAnswers, question.id) ? unfinishedAnswers[question.id] : ''
    const status = submitted.has(question.id) ? 'Answered' : skippedIds.has(question.id) ? 'Skipped'
      : draft.trim() ? 'Unfinished' : 'Unanswered'
    return { ...question, number: index + 1, status, answer, draft }
  })

  const total = configuration.questionCount
  const words = answers.reduce((sum, answer) => sum + countAnswerWords(answer.text), 0)
  const stats = [
    ['Total questions', total],
    ['Questions answered', answers.length],
    ['Skipped questions', skipped.length],
    ['Unanswered questions', total - answers.length - skipped.length],
    ['Completion rate', `${Math.round(100 * answers.length / total)}%`],
    ['Time spent', formatInterviewDuration(session.elapsedMs)],
    ['Average answer length', answers.length ? `${Math.round(words * 10 / answers.length) / 10} words` : '—'],
    ['Total words written', words]
  ]
  const overview = [
    ['Interview type', interviewTypeLabels[configuration.interviewType]],
    ['Job role', configuration.role],
    ...(configuration.companyName ? [['Company name', configuration.companyName]] : []),
    ['Experience level', optionLabel(experienceOptions, configuration.experience)],
    ['Difficulty', optionLabel(difficultyOptions, configuration.difficulty)],
    ['Interview language', optionLabel(languageOptions, configuration.language)],
    ['Completion date', new Date(session.completedAt).toLocaleString()],
    ['Completion reason', completionLabels[session.completionReason]]
  ]
  const setup = [
    ['Format', 'Text'],
    ['Question count', total],
    ['Configured duration', optionLabel(durationOptions, configuration.durationMinutes)]
  ]
  if (configuration.interviewType === 'custom') {
    const active = customInterviewTypes.filter(type => configuration.types.includes(type.id))
    setup.push(['Interview types', active.map(type => type.label).join(', ')],
      ...active.map(({ field, focusLabel }) => [focusLabel, configuration[field].join(', ')]))
    if (configuration.jobDescription) setup.push(['Job description', configuration.jobDescription])
    if (configuration.instructions) setup.push(['Additional instructions', configuration.instructions])
    if (configuration.customQuestions.length) {
      setup.push(['Configured custom questions', configuration.customQuestions.map((question, index) =>
        `${index + 1}. ${question}`).join('\n')])
    }
  } else {
    const labels = { technical: 'Technical skills', behavioral: 'Behavioral topics', general: 'Interview topics' }
    setup.push([labels[configuration.interviewType], (configuration.skills ?? configuration.topics).join(', ')])
  }

  return { overview, setup, stats, review, undelivered: total - questions.length }
}
