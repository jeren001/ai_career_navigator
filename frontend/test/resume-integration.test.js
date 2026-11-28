import assert from 'node:assert/strict'
import test from 'node:test'
import { resumePayload, resumeRecord } from '../src/services/cvRepository.js'

test('CV Builder sends only supported resume fields and maps Simplified Chinese', () => {
  const payload = resumePayload({
    title: '数据分析简历',
    data: {
      international: { locale: 'zh-Hans' },
      basicInformation: { phone: '555-0100' },
      design: { photo: { src: 'private' } },
      skills: { technicalSkills: ['SQL'], languages: [{ name: '中文' }] },
      workExperience: [{ jobTitle: '分析师', company: '机构', startDate: '2024-01',
        currentlyWorking: true, description: '分析业务数据' }],
      education: [{ institution: '大学', degree: '学士' }],
      sections: { content: { projects: [{ name: '仪表板', details: '设计指标' }],
        certifications: [{ name: '证书', issuer: '机构', date: '2025' }] } }
    }
  }, 'en')
  assert.deepEqual(payload, {
    title: '数据分析简历', language: 'zh-CN',
    contact: { full_name: null, email: null, phone: '555-0100', location: null, website: null },
    styling: { font_family: null, accent_color: null, font_size: null, template: null },
    custom_sections: [],
    draft_progress: { current_step: 'basic', completed_steps: [] },
    sections: {
      skills: [{ name: 'SQL' }],
      work_experience: [{ name: '分析师', organization: '机构', dates: '2024-01 – Present', details: '分析业务数据' }],
      education: [{ name: '学士', organization: '大学' }],
      projects: [{ name: '仪表板', details: '设计指标' }],
      certifications: [{ name: '证书', organization: '机构', dates: '2025' }]
    }
  })
})

test('CV hydration prefers the current server content over a stale browser copy', () => {
  const server = { id: 'resume', title: 'Updated', language: 'zh-CN', updated_at: 'v2',
    sections: { skills: [{ name: 'SQL' }], work_experience: [{ name: 'Analyst', dates: '2024-01 – Present' }] } }
  const stale = { updatedAt: 'v1', data: { skills: { technicalSkills: ['old'] } } }
  const record = resumeRecord(server, stale)
  assert.deepEqual(record.data.skills.technicalSkills, ['SQL'])
  assert.equal(record.data.workExperience[0].currentlyWorking, true)
  assert.equal(record.data.international.locale, 'zh-Hans')
  assert.deepEqual(resumeRecord(server, { ...stale, updatedAt: 'v2' }).data.skills, stale.data.skills)
})

test('server editor fields restore styling, custom text and draft progress without browser storage', () => {
  const remote = {
    id: 'resume', title: 'Draft', language: 'en', updated_at: 'now',
    contact: { full_name: 'Taylor', website: 'https://example.com' },
    styling: { template: 'ats-friendly', font_family: 'Georgia', font_size: 13, accent_color: '#112233' },
    custom_sections: [{ title: 'Portfolio', content: 'Research\nCase study\n\nResults' }],
    draft_progress: { current_step: 'education', completed_steps: ['basic', 'experience'] },
    sections: {}
  }
  const record = resumeRecord(remote)
  assert.equal(record.step, 3)
  assert.equal(record.status, 'draft')
  assert.equal(record.data.basicInformation.email, '')
  assert.equal(record.data.design.fontSize, 13)
  assert.equal(record.data.template, 'ats-friendly')
  const payload = resumePayload(record, 'en')
  assert.deepEqual(payload.custom_sections, remote.custom_sections)
  assert.deepEqual(payload.draft_progress, remote.draft_progress)
  assert.deepEqual(payload.styling, remote.styling)
  assert.equal(payload.contact.website, remote.contact.website)
  assert.throws(() => resumePayload({ ...record, data: {
    ...record.data, basicInformation: { website: 'http://example.com' }
  } }, 'en'), { message: 'resume_website' })
})
