import { useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus, X } from 'lucide-react'
import { customQuestionLimitError, emptyQuestionEditor, validateCustomQuestion } from '../../../services/customInterviewConfig'
import { cleanEntry } from '../../../services/interviewSetupConfig'

export default function CustomQuestions({ bank, total, error, onChange }) {
  const { questions, editor } = bank
  const [editorError, setEditorError] = useState('')
  const editorInput = useRef(null)
  const editButtons = useRef(new Map())
  const editing = editor.original !== null
  const message = editorError || customQuestionLimitError(questions.length, total) || error

  function setEditor(nextEditor) {
    setEditorError('')
    onChange({ questions, editor: nextEditor })
  }

  function saveQuestion() {
    const problem = validateCustomQuestion(editor.text, questions, editor.original)
    if (problem) {
      setEditorError(problem)
    } else {
      const text = cleanEntry(editor.text)
      const updated = editing
        ? questions.map(question => question === editor.original ? text : question)
        : [...questions, text]
      setEditorError('')
      onChange({ questions: updated, editor: emptyQuestionEditor })
    }
    editorInput.current.focus()
  }

  function removeQuestion(question) {
    onChange({
      questions: questions.filter(item => item !== question),
      editor: editor.original === question ? emptyQuestionEditor : editor
    })
    setEditorError('')
    editorInput.current.focus()
  }

  function moveQuestion(index, direction) {
    const destination = index + direction
    if (destination < 0 || destination >= questions.length) return
    const reordered = [...questions]
    const [question] = reordered.splice(index, 1)
    reordered.splice(destination, 0, question)
    onChange({ questions: reordered, editor })
    requestAnimationFrame(() => editButtons.current.get(question)?.focus())
  }

  return (
    <section className="interview-setup-panel interview-setup-fields" aria-labelledby="custom-questions-title">
      <div className="interview-setup-field">
        <h3 id="custom-questions-title">Custom questions</h3>
        <p id="custom-question-count" className="interview-setup-hint" role="status">
          {questions.length} of {total} total questions are custom.
        </p>
      </div>
      {questions.length > 0 && (
        <ol className="custom-question-list" aria-label="Custom questions">
          {questions.map((question, index) => (
            <li key={question}>
              <span>{question}</span>
              <div className="custom-question-actions">
                <button type="button" aria-label={`Edit question ${index + 1}`}
                  ref={element => {
                    if (element) editButtons.current.set(question, element)
                    else editButtons.current.delete(question)
                  }}
                  onClick={() => {
                    setEditor({ text: question, original: question })
                    editorInput.current.focus()
                  }}>
                  <Pencil size={15} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Move question ${index + 1} up`} disabled={index === 0}
                  onClick={() => moveQuestion(index, -1)}>
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Move question ${index + 1} down`} disabled={index === questions.length - 1}
                  onClick={() => moveQuestion(index, 1)}>
                  <ArrowDown size={17} aria-hidden="true" />
                </button>
                <button type="button" aria-label={`Remove question ${index + 1}`} onClick={() => removeQuestion(question)}>
                  <X size={17} aria-hidden="true" />
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      <div className="interview-setup-field">
        <label htmlFor="custom-question-text">{editing ? 'Edit question' : 'New question'}</label>
        <textarea ref={editorInput} id="custom-question-text" name="questionBank" rows={2} value={editor.text}
          aria-invalid={message ? true : undefined}
          aria-describedby={message ? 'custom-question-count custom-question-error' : 'custom-question-count'}
          onChange={event => setEditor({ ...editor, text: event.target.value })} />
        {message && <p className="interview-setup-error" id="custom-question-error" role="alert">{message}</p>}
        <div className="custom-question-actions">
          <button type="button" className="interview-setup-secondary" onClick={saveQuestion}>
            {editing ? 'Save Question' : <><Plus size={16} aria-hidden="true" /> Add Question</>}
          </button>
          {(editing || editor.text) && (
            <button type="button" className="interview-setup-secondary" onClick={() => {
              setEditor(emptyQuestionEditor)
              editorInput.current.focus()
            }}>
              {editing ? 'Cancel Edit' : 'Clear Question'}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
