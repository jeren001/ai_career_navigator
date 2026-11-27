import { ArrowLeft, ArrowRight, FileCheck, Save } from 'lucide-react'

const stepNames = ['Basic Information', 'Work Experience', 'Education', 'Skills', 'Template & Create']

export default function CVFormNavigation({
  currentStep,
  onBack,
  onNext,
  onDraft,
  onCreate,
  createLabel,
  saving,
  blocked,
  canSkip
}) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === stepNames.length

  return (
    <div className="cv-form-navigation">
      <button type="button" className="cv-navigation-back" onClick={onBack} disabled={Boolean(saving)}>
        <ArrowLeft size={19} aria-hidden="true" />
        {isFirstStep ? 'Back to CV Builder' : 'Back'}
      </button>
      <div className="cv-save-actions">
        {onDraft && (
          <button type="button" className="cv-navigation-back" onClick={onDraft} disabled={Boolean(saving) || blocked} aria-busy={saving === 'draft'}>
            <Save size={18} aria-hidden="true" />
            {saving === 'draft' ? 'Saving draft…' : 'Save Draft'}
          </button>
        )}
        {(isLastStep || !onDraft) && (
          <button type="button" className="cv-navigation-next cv-navigation-create" onClick={onCreate}
            disabled={Boolean(saving) || blocked} aria-busy={saving === 'completed'}>
            {saving === 'completed' ? 'Saving CV…' : createLabel}
            <FileCheck size={20} aria-hidden="true" />
          </button>
        )}
        {!isLastStep && (
          <button type="button" className="cv-navigation-next" onClick={onNext} disabled={Boolean(saving)}>
            {canSkip ? `Skip to ${stepNames[currentStep]}` : `Next: ${stepNames[currentStep]}`}
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
