import { useLocale } from '../../../lib/locale.js'
import { cvLabel } from '../cvLabels.js'
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
  const { locale, t } = useLocale()
  const label = (value) => cvLabel(value, locale)
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === stepNames.length

  return (
    <div className="cv-form-navigation">
      <button type="button" className="cv-navigation-back" onClick={onBack} disabled={Boolean(saving)}>
        <ArrowLeft size={19} aria-hidden="true" />
        {isFirstStep ? label('Back to CV Builder') : label('Back')}
      </button>
      <div className="cv-save-actions">
        {onDraft && (
          <button type="button" className="cv-navigation-back" onClick={onDraft} disabled={Boolean(saving) || blocked} aria-busy={saving === 'draft'}>
            <Save size={18} aria-hidden="true" />
            {saving === 'draft' ? label('Saving draft…') : label('Save Draft')}
          </button>
        )}
        {(isLastStep || !onDraft) && (
          <button type="button" className="cv-navigation-next cv-navigation-create" onClick={onCreate}
            disabled={Boolean(saving) || blocked} aria-busy={saving === 'completed'}>
            {saving === 'completed' ? label('Saving CV…') : createLabel}
            <FileCheck size={20} aria-hidden="true" />
          </button>
        )}
        {!isLastStep && (
          <button type="button" className="cv-navigation-next" onClick={onNext} disabled={Boolean(saving)}>
            {canSkip ? t(`Skip to ${stepNames[currentStep]}`, `跳至${label(stepNames[currentStep])}`) : t(`Next: ${stepNames[currentStep]}`, `下一步：${label(stepNames[currentStep])}`)}
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}
