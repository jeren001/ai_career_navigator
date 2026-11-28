export const TITLE_LIMIT = 80

function entryFields(...fields) {
  return fields.map(([key, label, multiline = false]) => ({ key, label, multiline }))
}

export const standardSections = {
  personal: { title: 'Personal Information', step: 1 },
  summary: { title: 'Professional Summary', aliases: ['Summary', 'Profile', 'About Me', 'Executive Summary'] },
  experience: { title: 'Work Experience', step: 2, aliases: ['Experience', 'Work History', 'Employment History'] },
  education: { title: 'Education', step: 3, aliases: ['Education and Training'] },
  skills: { title: 'Skills', aliases: ['Key Skills', 'Skills and Examples', 'Technical Skills', 'Digital Skills'] },
  languages: { title: 'Languages', step: 4, aliases: ['Language Proficiency'] },
  certifications: {
    title: 'Certifications',
    aliases: ['Certificates', 'Accreditations'],
    fields: entryFields(['name', 'Certification'], ['issuer', 'Issuer'], ['date', 'Date'], ['details', 'Details', true])
  },
  projects: {
    title: 'Projects',
    fields: entryFields(['name', 'Project name'], ['role', 'Role'], ['link', 'Project link'], ['details', 'Description', true])
  },
  volunteering: {
    title: 'Volunteering',
    aliases: ['Volunteer Experience'],
    fields: entryFields(['role', 'Role'], ['organization', 'Organization'], ['dates', 'Dates'], ['details', 'Description', true])
  },
  awards: {
    title: 'Awards & Achievements',
    aliases: ['Awards', 'Achievements'],
    fields: entryFields(['name', 'Award or achievement'], ['issuer', 'Issuer'], ['date', 'Date'], ['details', 'Details', true])
  },
  publications: {
    title: 'Publications',
    fields: entryFields(['title', 'Publication title'], ['publisher', 'Publisher'], ['date', 'Date'], ['link', 'Publication link'], ['details', 'Details', true])
  },
  interests: {
    title: 'Interests',
    fields: entryFields(['name', 'Interest'], ['details', 'Details', true])
  },
  references: {
    title: 'References',
    fields: entryFields(['name', 'Reference name'], ['relationship', 'Role or relationship'], ['contact', 'Contact details'], ['details', 'Details', true])
  }
}

export const customFields = entryFields(['heading', 'Entry heading'], ['body', 'Entry content', true])

const additionalKeys = Object.keys(standardSections).filter(key => standardSections[key].fields)

export function entryHasContent(entry, fields) {
  return fields.some(({ key }) => entry[key]?.trim())
}

export function sectionHasContent(cvData, id) {
  switch (id) {
    case 'personal': return true
    case 'summary': return Boolean(cvData.basicInformation.summary?.trim())
    case 'experience': return cvData.workExperience.length > 0
    case 'education': return cvData.education.length > 0
    case 'skills': return (cvData.skills?.technicalSkills?.length ?? 0) + (cvData.skills?.softSkills?.length ?? 0) > 0
    case 'languages': return (cvData.skills?.languages?.length ?? 0) > 0
    default: {
      const fields = standardSections[id]?.fields
      return fields
        ? Boolean(cvData.sections?.content?.[id]?.some(entry => entryHasContent(entry, fields)))
        : Boolean(cvData.sections?.custom?.find(item => item.id === id)?.entries.some(entry => entryHasContent(entry, customFields)))
    }
  }
}

export function availableSections(cvData) {
  return Object.keys(standardSections).filter(id => {
    const settings = cvData.sections?.settings?.[id]
    if (settings?.removed) return true
    return additionalKeys.includes(id) && !settings?.added && !sectionHasContent(cvData, id)
  })
}
