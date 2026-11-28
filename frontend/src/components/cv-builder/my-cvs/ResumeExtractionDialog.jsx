import { useState } from 'react'
import { apiErrorText, useLocale } from '../../../lib/locale.js'
import { CVDialog } from './CVManagementDialog'

const labels = {
  full_name: ['Full name', '姓名'], email: ['Email', '邮箱'], phone: ['Phone', '电话'],
  location: ['Location', '地点'], website: ['Website', '个人网站'],
  skills: ['Skills', '技能'], education: ['Education', '教育背景'], work_experience: ['Work experience', '工作经历'],
  projects: ['Projects', '项目'], certifications: ['Certifications', '证书']
}

export default function ResumeExtractionDialog({ extraction, onClose, onApply }) {
  const { t } = useLocale()
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const contacts = Object.entries(extraction.contact ?? {})
  const groups = Object.entries(extraction.sections ?? {}).filter(([, rows]) => rows.length > 0)
  const name = (key) => labels[key] ? t(...labels[key]) : key

  function check(key) {
    return {
      type: 'checkbox', checked: selected.includes(key),
      onChange: (event) => {
        const enabled = event.target.checked
        setSelected((items) => enabled ? [...items, key] : items.filter((item) => item !== key))
      }
    }
  }

  async function submit(event) {
    event.preventDefault()
    if (busy || !selected.length) return
    setError(null)
    setBusy(true)
    try {
      const contact = Object.fromEntries(contacts.filter(([key]) => selected.includes(key)))
      const sections = Object.fromEntries(groups.map(([section, rows]) => [
        section, rows.filter((_, index) => selected.includes(`${section}:${index}`))
      ]).filter(([, rows]) => rows.length))
      await onApply({ contact, sections })
    } catch (failure) {
      setError(failure)
      setBusy(false)
    }
  }

  return (
    <CVDialog label={t('Review extracted fields', '核对提取字段')} onClose={onClose} canClose={!busy}>
      <form onSubmit={submit}>
        <h2>{t('Review extracted fields', '核对提取字段')}</h2>
        <p>{t('Select only the fields you want to save. Selected contact fields replace those values. Selected entries are added to their sections.',
          '仅选择要保存的字段。所选联系方式会替换相应值，所选条目会加入对应栏目。')}</p>
        {!contacts.length && !groups.length && <p>{t('No structured fields were found in this file.', '此文件中未找到可提取的结构化字段。')}</p>}
        <div className="cv-extraction-fields">
          {contacts.length > 0 && <fieldset disabled={busy}>
            <legend>{t('Contact details', '联系方式')}</legend>
            {contacts.map(([key, value]) => (
              <label key={key}><input {...check(key)} /> <span>{name(key)}: <bdi>{value}</bdi></span></label>
            ))}
          </fieldset>}
          {groups.map(([section, rows]) => (
            <fieldset key={section} disabled={busy}>
              <legend>{name(section)}</legend>
              {rows.map((row, index) => <label key={index}>
                <input {...check(`${section}:${index}`)} />
                <span dir="auto">{[row.name, row.organization, row.dates, row.details].filter(Boolean).join(' · ')}</span>
              </label>)}
            </fieldset>
          ))}
        </div>
        {error && <p role="alert">{error.message === 'resume_field_limit'
          ? t('Select fewer entries. Each section can hold up to 25.', '请选择更少的条目。每栏最多 25 条。')
          : apiErrorText(error, t)}</p>}
        <div className="cv-section-actions">
          <button type="button" className="cv-design-action" disabled={busy} onClick={onClose}>{t('Close', '关闭')}</button>
          <button type="submit" className="cv-design-action" disabled={!selected.length || busy}>
            {busy ? t('Saving…', '正在保存…') : t('Apply selected fields', '应用所选字段')}
          </button>
        </div>
      </form>
    </CVDialog>
  )
}
