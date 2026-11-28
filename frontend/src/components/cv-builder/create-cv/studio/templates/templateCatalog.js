import { INTERNATIONAL_CATEGORY, internationalFormatCatalog } from './internationalFormatCatalog.js'

export const DEFAULT_TEMPLATE_ID = 'ats-friendly'

export const templateCategories = [
  'Minimalist', 'Modern', 'Classic', 'Creative', 'Professional', 'ATS-Friendly',
  'Student & Graduate', 'Academic', 'Executive', 'Technical', INTERNATIONAL_CATEGORY
]

const standardSections = ['Summary', 'Experience', 'Education', 'Skills']

// Catalog creation dates use calendar dates. These layouts entered the catalog together.
const catalogCreationDate = '2026-11-27'

function defineTemplate(id, name, category, description, layout, createdAt = catalogCreationDate) {
  return {
    id,
    name,
    category,
    description,
    createdAt,
    layout: {
      header: 'plain',
      fontFamily: 'sans-serif',
      accent: '#071b60',
      mainSections: standardSections,
      sidebarSections: [],
      ...layout
    }
  }
}

export const templateCatalog = [
  defineTemplate('ats-friendly', 'ATS-Friendly', 'ATS-Friendly',
    'Plain headings and a single reading column.', { accent: '#222222' }),
  defineTemplate('modern', 'Modern', 'Modern',
    'A tinted name banner above a balanced single-column layout.',
    { header: 'tinted', accent: '#1c65af' }),
  defineTemplate('professional', 'Professional', 'Professional',
    'A centered masthead and clear headings for an experience-led CV.',
    { header: 'centered', mainSections: ['Experience', 'Summary', 'Education', 'Skills'] }),
  defineTemplate('essential', 'Essential', 'Minimalist',
    'Open spacing, compact contact details and understated headings.',
    { header: 'inline', sectionStyle: 'open', accent: '#334155' }),
  defineTemplate('heritage', 'Heritage', 'Classic',
    'Serif typography and a ruled masthead for a traditional CV.',
    { header: 'ruled', fontFamily: 'serif', accent: '#533b30' }),
  defineTemplate('portfolio', 'Portfolio', 'Creative',
    'A bold name banner, project-first content and a narrow skills sidebar.',
    {
      header: 'solid', accent: '#67418b', sidebarPosition: 'left',
      mainSections: ['Projects', 'Experience'], sidebarSections: ['Skills', 'Education']
    }),
  defineTemplate('launch', 'Launch', 'Student & Graduate',
    'A qualifications-first layout that gives coursework and projects room.',
    { header: 'tinted', mainSections: ['Education', 'Projects', 'Experience', 'Skills'] }),
  defineTemplate('scholar', 'Scholar', 'Academic',
    'A serif CV with dedicated space for research and publications.',
    {
      header: 'plain', fontFamily: 'serif', sectionStyle: 'open',
      mainSections: ['Research', 'Publications', 'Education', 'Teaching']
    }),
  defineTemplate('leadership', 'Leadership', 'Executive',
    'A full-width masthead followed by a summary and leadership achievements.',
    {
      header: 'solid', fontFamily: 'serif',
      mainSections: ['Executive Summary', 'Leadership', 'Board Roles', 'Education']
    }),
  defineTemplate('systems', 'Systems', 'Technical',
    'Experience and projects take the main column, with tools and skills alongside.',
    {
      header: 'inline', accent: '#145c58', sidebarPosition: 'right',
      mainSections: ['Experience', 'Projects'], sidebarSections: ['Skills', 'Tools']
    }),
  defineTemplate('global', 'Global', null,
    'A centered masthead and a dedicated section for language proficiency.',
    { header: 'centered', accent: '#265d75', mainSections: ['Summary', 'Languages', 'Experience', 'Education'] }),
  ...internationalFormatCatalog
]

export function getTemplateById(id) {
  return templateCatalog.find(template => template.id === id)
}
