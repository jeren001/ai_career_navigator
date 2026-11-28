import { ApiError } from '../lib/api.js'

const endpoint = '/api/resumes'

function field(value, limit) {
  const text = value?.trim()
  if (text && ([...text].length > limit || text.includes('\0'))) throw new ApiError(400, 'resume_field_limit')
  return text || undefined
}

function entries(values, map) {
  const result = []
  for (const value of values) {
    const { name, organization, dates, details } = map(value)
    if (!name?.trim()) continue
    result.push({
      name: field(name, 120),
      ...Object.fromEntries(Object.entries({
        organization: field(organization, 120), dates: field(dates, 80), details: field(details, 500)
      }).filter(([, value]) => value !== undefined))
    })
  }
  if (result.length > 25) throw new ApiError(400, 'resume_field_limit')
  return result
}

function dateRange(start, end, current) {
  return [start, current ? 'Present' : end].filter(Boolean).join(' – ')
}

export const resumeSteps = ['basic', 'experience', 'education', 'skills', 'design']

const contactFields = [
  ['full_name', 'fullName', 120], ['email', 'email', 254], ['phone', 'phone', 60],
  ['location', 'location', 160], ['website', 'website', 2048]
]
const styleFields = [['font_family', 'fontFamily'], ['accent_color', 'accent'], ['font_size', 'fontSize']]

function customSections(data) {
  return (data.sections?.custom ?? []).flatMap(({ title, entries: items }) => {
    const content = items.map(({ heading, body }) => [heading?.trim(), body?.trim()].filter(Boolean).join('\n'))
      .filter(Boolean).join('\n\n')
    return content ? [{ title: field(title, 120), content: field(content, 4000) }] : []
  })
}

function editorPayload(record, data) {
  const contact = Object.fromEntries(contactFields.map(([key, name, limit]) =>
    [key, field(data.basicInformation?.[name], limit) ?? null]))
  if (contact.website) {
    try {
      if (new URL(contact.website).protocol !== 'https:') throw new Error()
    } catch {
      throw new ApiError(400, 'resume_website')
    }
  }
  const styling = Object.fromEntries(styleFields.map(([key, name]) => [key, data.design?.[name] ?? null]))
  if (styling.font_size !== null) styling.font_size = Math.round(styling.font_size)
  styling.template = field(data.template ?? record.templateId, 60) ?? null
  const custom = customSections(data)
  if (custom.length > 10) throw new ApiError(400, 'resume_custom_limit')
  const index = Math.max(0, Math.min(resumeSteps.length - 1, (record.step ?? 1) - 1))
  return {
    contact, styling, custom_sections: custom,
    draft_progress: {
      current_step: resumeSteps[index],
      completed_steps: record.status === 'completed' ? resumeSteps
        : record.completedSteps ?? resumeSteps.slice(0, index)
    }
  }
}

export function resumePayload(record, locale) {
  const data = record.data
  const language = data.international?.locale || record.language || locale
  const content = data.sections?.content ?? {}
  return {
    title: field(record.title, 120),
    language: ['zh-CN', 'zh-Hans'].includes(language) ? 'zh-CN' : 'en',
    ...editorPayload(record, data),
    sections: {
      skills: entries([...(data.skills?.technicalSkills ?? []), ...(data.skills?.softSkills ?? [])],
        (name) => ({ name })),
      work_experience: entries(data.workExperience ?? [], (item) => ({
        name: item.jobTitle, organization: item.company,
        dates: dateRange(item.startDate, item.endDate, item.currentlyWorking), details: item.description
      })),
      education: entries(data.education ?? [], (item) => ({
        name: item.degree || item.institution, organization: item.institution,
        dates: dateRange(item.startDate, item.endDate, item.currentlyStudying), details: item.description
      })),
      projects: entries(content.projects ?? [], (item) => ({ name: item.name, details: item.details })),
      certifications: entries(content.certifications ?? [], (item) => ({
        name: item.name, organization: item.issuer, dates: item.date, details: item.details
      }))
    }
  }
}

function hydrateEditor(server, data, local) {
  const serverContact = server.contact ?? {}
  const hasEditorData = Boolean(server.draft_progress?.current_step || Object.keys(serverContact).length)
  const storeBlank = hasEditorData && (!local || server.draft_progress?.current_step)
  const contact = Object.fromEntries(contactFields.flatMap(([key, name]) =>
    storeBlank || Object.hasOwn(serverContact, key) ? [[name, serverContact[key] ?? '']] : []))
  const design = Object.fromEntries(styleFields.flatMap(([key, name]) =>
    server.styling?.[key] != null ? [[name, server.styling[key]]] : []))
  const custom = server.custom_sections
  // Existing browser copies retain richer entry formatting when the saved projection matches.
  const hydratedCustom = custom?.length && !local ? custom.map(({ title, content }, index) => ({
    id: `server-custom-${index}`, title, entries: [{ id: `server-entry-${index}`, heading: '', body: content }]
  })) : null
  return {
    ...data,
    basicInformation: { ...data.basicInformation, ...contact },
    design: { ...data.design, ...design },
    ...(server.styling?.template && { template: server.styling.template }),
    ...(hydratedCustom && { sections: { ...data.sections, custom: hydratedCustom } })
  }
}

export function resumeRecord(server, decoration) {
  const local = decoration?.updatedAt === server.updated_at ? decoration : null
  const progress = server.draft_progress
  const completedSteps = progress?.completed_steps ?? local?.completedSteps
  const step = resumeSteps.indexOf(progress?.current_step) + 1 || local?.step
  const status = completedSteps
    ? resumeSteps.every((item) => completedSteps.includes(item)) ? 'completed' : 'draft'
    : local?.status ?? 'draft'
  const data = local?.data ?? (server.sections ? fromSections(server) : null)
  return {
    ...local, id: server.id, title: server.title, language: server.language,
    createdAt: server.created_at, updatedAt: server.updated_at, fileType: server.file_media_type,
    extractedText: server.extracted_text, status, step, completedSteps,
    ...(data && { data: hydrateEditor(server, data, local?.data) })
  }
}

function fromSections(server) {
  const sections = server.sections
  const rows = (key, map) => (sections[key] ?? []).map((item, index) => ({ id: key + index, ...map(item) }))
  const range = (dates = '') => {
    const [startDate, endDate] = dates.split(' – ')
    const month = (date) => /^\d{4}-\d{2}$/.test(date) ? date : ''
    return { startDate: month(startDate), endDate: month(endDate), current: endDate === 'Present' }
  }
  return {
    basicInformation: {},
    skills: { technicalSkills: (sections.skills ?? []).map(({ name }) => name), softSkills: [], languages: [] },
    workExperience: rows('work_experience', ({ name, organization, dates, details }) => {
      const { current, ...months } = range(dates)
      return { ...months, jobTitle: name, company: organization ?? '', location: '', employmentType: '',
        currentlyWorking: current, description: details ?? '' }
    }),
    education: rows('education', ({ name, organization, dates, details }) => {
      const { current, ...months } = range(dates)
      return { ...months, degree: name, institution: organization ?? '', fieldOfStudy: '', location: '',
        grade: '', currentlyStudying: current, description: details ?? '' }
    }),
    sections: { content: {
      projects: rows('projects', ({ name, details }) => ({ name, role: '', link: '', details: details ?? '' })),
      certifications: rows('certifications', ({ name, organization, dates, details }) => ({
        name, issuer: organization ?? '', date: dates ?? '', details: details ?? ''
      }))
    } },
    international: { locale: server.language === 'zh-CN' ? 'zh-Hans' : 'en' }
  }
}

// Keep unsupported design and draft fields on this browser, keyed by account and server record.
async function decoration(mode, action) {
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open('career-navigator-resume-design', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('documents')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('documents', mode)
      const request = action(tx.objectStore('documents'))
      tx.oncomplete = () => resolve(request.result)
      tx.onabort = () => reject(tx.error ?? request.error)
    })
  } finally {
    db.close()
  }
}

export function createCVRepository(request, userId, locale) {
  const key = (id) => [userId, id]
  const readLocal = (id) => decoration('readonly', (store) => store.get(key(id))).catch(() => null)
  async function saved(server, record) {
    const result = { ...record, id: server.id, updatedAt: server.updated_at, createdAt: server.created_at }
    let localSaveFailed = false
    try {
      await decoration('readwrite', (store) => store.put(result, key(server.id)))
    } catch {
      localSaveFailed = true
    }
    return { ...resumeRecord(server, result), localSaveFailed }
  }
  return {
    async list(signal) {
      const records = new Map()
      let offset = 0
      do {
        const page = await request(`${endpoint}?offset=${offset}`, { signal })
        for (const item of page.resumes) records.set(item.id, item)
        offset = page.next_offset
      } while (offset !== null)
      return Promise.all([...records.values()].map(async (item) => resumeRecord(item, await readLocal(item.id))))
    },
    async get(id) {
      const { resume } = await request(`${endpoint}/${id}`)
      return resumeRecord(resume, await readLocal(id))
    },
    async save(record, updating) {
      const body = resumePayload(record, locale)
      const { resume } = await request(updating ? `${endpoint}/${record.id}` : endpoint, {
        method: updating ? 'PATCH' : 'POST', body
      })
      return saved(resume, record)
    },
    async rename(id, title) {
      const local = await readLocal(id)
      const before = local ? (await request(`${endpoint}/${id}`)).resume : null
      const { resume } = await request(`${endpoint}/${id}`, { method: 'PATCH', body: { title } })
      return local?.updatedAt === before?.updated_at && before &&
        JSON.stringify(before.sections) === JSON.stringify(resume.sections) ? saved(resume, local) : resumeRecord(resume)
    },
    async remove(id) {
      await request(`${endpoint}/${id}`, { method: 'DELETE' })
      await decoration('readwrite', (store) => store.delete(key(id))).catch(() => {})
    },
    async upload(file) {
      const { resume, extraction } = await request(`${endpoint}/upload?language=${locale}`, { method: 'POST', rawBody: file })
      return { record: resumeRecord(resume), extraction }
    },
    extraction(id) {
      return request(`${endpoint}/${id}/extraction`)
    },
    async applyExtraction(id, selection) {
      const local = await readLocal(id)
      const { resume: before } = await request(`${endpoint}/${id}`)
      const additions = {}
      const sections = Object.fromEntries(Object.entries(selection.sections).map(([key, selected]) => {
        const previous = before.sections[key] ?? []
        const signature = ({ name, organization, dates, details }) => JSON.stringify([name, organization, dates, details])
        const seen = new Set(previous.map(signature))
        additions[key] = selected.filter((entry) => {
          const identity = signature(entry)
          if (seen.has(identity)) return false
          seen.add(identity)
          return true
        })
        if (previous.length + additions[key].length > 25) throw new ApiError(400, 'resume_field_limit')
        return [key, [...previous, ...additions[key]]]
      }))
      const { resume } = await request(`${endpoint}/${id}`, {
        method: 'PATCH', body: { contact: selection.contact, sections }
      })
      if (!local?.data || local.updatedAt !== before.updated_at) return resumeRecord(resume)
      const extra = fromSections({ ...resume, sections: additions })
      const data = local.data
      const append = (older = [], newer) => [...older,
        ...newer.map((item) => ({ ...item, id: crypto.randomUUID() }))]
      const technicalSkills = extra.skills.technicalSkills.filter((name) =>
        ![...(data.skills?.technicalSkills ?? []), ...(data.skills?.softSkills ?? [])].includes(name))
      return saved(resume, { ...local, data: {
        ...data,
        skills: { ...data.skills, technicalSkills: [...(data.skills?.technicalSkills ?? []), ...technicalSkills] },
        workExperience: append(data.workExperience, extra.workExperience),
        education: append(data.education, extra.education),
        sections: { ...data.sections, content: {
          ...data.sections?.content,
          projects: append(data.sections?.content?.projects, extra.sections.content.projects),
          certifications: append(data.sections?.content?.certifications, extra.sections.content.certifications)
        } }
      } })
    },
    original(id) {
      return request(`${endpoint}/${id}/file`, { responseType: 'blob', accept: 'application/octet-stream' })
    },
    analyze(id, target) {
      return request(`${endpoint}/${id}/analyze`, {
        method: 'POST', body: { consent: true, ...(target.trim() && { target_role: target.trim() }) }
      })
    }
  }
}
