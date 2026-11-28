import { internationalFormatCatalog } from '../templates/internationalFormatCatalog'

const fields = {
  pageSize: 'Page size',
  dateFormat: 'Date format',
  photo: 'Profile photo',
  sections: 'Recommended sections',
  personal: 'Personal information',
  length: 'CV length',
  structure: 'Document structure'
}

export const guidelineFields = fields

const details = {
  US: { scope: 'CareerOneStop résumé guidance for job seekers, including transitioning service members.', structure: 'A reverse-chronological résumé is one common option.' },
  CA: {
    scope: 'Job Bank guidance for general job searches. Individual postings may specify different requirements.',
    photo: 'Job Bank advises leaving photographs off Canadian résumés.',
    sections: 'Highlight accomplishments and consider including relevant volunteer experience.',
    personal: 'Use accurate contact information and avoid unrelated personal details.',
    length: 'Job Bank recommends limiting a résumé to two pages.'
  },
  GB: {
    scope: 'National Careers Service guidance. Adapt the order to your career stage and vacancy.',
    sections: 'Include an introduction, education and work history. References can be offered on request.',
    personal: 'Include contact information and omit unrelated personal characteristics.',
    structure: 'Use headings and put recent work experience first.'
  },
  europass: {
    scope: 'European Commission advice for its Europass service. It describes that service’s CV format.',
    sections: 'Use an About Me section and relevant work, education, training and skills.',
    structure: 'Use reverse chronological order.',
    photo: 'Europass guidance suggests a professional photograph.'
  },
  DE: { scope: 'Make it in Germany guidance for applicants to German IT companies.', photo: 'The source describes photographs as common in its example context and optional.' },
  FR: { scope: 'France Travail describes layout examples for work experience.', structure: 'A dated timeline is one way to present work history.' },
  JP: {
    scope: 'Hello Work offers ministry sample forms. Check the employer’s instructions for the applicable document.',
    pageSize: 'The ministry publishes A4 and A3 samples. Choose the size requested by the employer.',
    sections: 'The sample includes education, work history and qualifications.',
    dateFormat: 'The sample lists years before months in the history tables.'
  },
  AU: { scope: 'Workforce Australia résumé-planning worksheet.', sections: 'Include relevant technical and employability skills.' },
  NZ: { scope: 'New Zealand careers service toolkit for job seekers.', structure: 'Choose a work-focused or skills-focused structure based on your experience.' },
  ZA: { scope: 'General government guidance. The personal data in its example is outside this recommendation.', sections: 'Consider work history, education, language proficiency and references where relevant.' },
  TM: { scope: 'Employment portal description. It establishes fields collected by the portal. Document conventions remain provisional.' },
  UZ: { scope: 'Regional government career guidance. Vacancy instructions can vary.', sections: 'Include recent experience, education, skills and achievements.', length: 'The source recommends keeping the résumé within two to three pages.' },
  KG: { scope: 'Public-service regional reserve sample. Its structure is specific to that recruitment process.' }
}

export const countryGuidelinesCatalog = Object.fromEntries(internationalFormatCatalog.map(template => {
  const { countryCode, formatCode, guidance } = template.internationalFormat
  const id = countryCode ?? formatCode
  const { scope, ...recommendations } = details[id] ?? {}
  return [id, {
    id,
    status: guidance?.provisional ? 'Provisional' : guidance ? 'Source-backed within scope' : 'Unavailable',
    scope: scope ?? 'Recruitment conventions have yet to be verified for this market.',
    presets: id === 'JP' ? { pageSizes: ['A4', 'A3'], dateFormat: 'year-first' } : null,
    sources: guidance ? [guidance.source] : [],
    lastVerified: guidance ? '2026-11-27' : null,
    recommendations: { structure: guidance?.convention, ...recommendations }
  }]
}))
