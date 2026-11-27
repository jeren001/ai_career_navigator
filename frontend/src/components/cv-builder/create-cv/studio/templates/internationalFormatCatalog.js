export const INTERNATIONAL_CATEGORY = 'International'

export const internationalRegions = [
  'North America', 'Europe', 'Eurasia', 'Asia', 'Oceania',
  'Latin America', 'Africa', 'Middle East', 'Central Asia'
]

const [northAmerica, europe, eurasia, asia, oceania, latinAmerica, africa, middleEast, centralAsia] =
  internationalRegions

// A format identifies a target market or regional scheme. CV language, writing
// direction and localization settings belong to the CV and are chosen separately.
function defineFormat(region, countryCode, name, description, layout, guidance, formatCode = null) {
  return {
    id: `international-${formatCode ?? countryCode.toLowerCase()}`,
    name,
    category: INTERNATIONAL_CATEGORY,
    createdAt: '2026-11-27',
    description,
    layout: {
      header: 'plain',
      fontFamily: 'sans-serif',
      accent: '#071b60',
      sidebarSections: [],
      ...layout
    },
    internationalFormat: {
      region,
      countryCode,
      formatCode,
      guidance: guidance ?? null
    }
  }
}

// Guidance covers the specific convention cited. Typography, colors and other
// gallery presentation choices are product design choices.
export const internationalFormatCatalog = [
  defineFormat(northAmerica, 'US', 'American',
    'A single-column résumé led by work history and accomplishments.',
    { mainSections: ['Experience', 'Education', 'Skills'], entryOrder: 'newest-first' },
    {
      convention: 'CareerOneStop describes a chronological résumé that starts with the most recent role.',
      source: 'https://cloudfront.careeronestop.org/Veterans/JobSearch/ResumesAndApplications/resume-styles.aspx'
    }),
  defineFormat(northAmerica, 'CA', 'Canadian',
    'A short profile followed by achievements from work and volunteering.',
    { header: 'inline', mainSections: ['Profile', 'Work Achievements', 'Volunteer Experience', 'Education'] },
    {
      convention: 'Job Bank emphasizes accomplishments and suggests including relevant volunteer work.',
      source: 'https://www.on.jobbank.gc.ca/findajob/resources/write-good-resume?wbdisable=true'
    }),
  defineFormat(europe, 'GB', 'British',
    'A personal profile, work history and education, with a short references section.',
    { header: 'ruled', mainSections: ['Profile', 'Work History', 'Education', 'References'], entryOrder: 'newest-first' },
    {
      convention: 'The National Careers Service describes an introduction, work and education history, and a short references note.',
      source: 'https://nationalcareers.service.gov.uk/careers-advice/cv-sections'
    }),
  defineFormat(europe, null, 'Europass',
    'An independent Europass-inspired layout with training and skills alongside experience.',
    {
      header: 'tinted', sidebarPosition: 'left', entryOrder: 'newest-first',
      mainSections: ['About Me', 'Work Experience', 'Education and Training'],
      sidebarSections: ['Languages', 'Digital Skills']
    },
    {
      convention: 'The Europass service groups experience, education, training and skills, and recommends reverse chronological order.',
      source: 'https://europass.europa.eu/en/create-europass-cv?lang=en'
    }, 'europass'),
  defineFormat(europe, 'DE', 'German',
    'A tabular layout with a separate date column for experience and education.',
    { header: 'ruled', entryStyle: 'date-column', mainSections: ['Experience', 'Education', 'Languages'] },
    {
      convention: 'The German federal portal Make it in Germany describes a CV in tabular form.',
      source: 'https://www.make-it-in-germany.com/en/working-in-germany/it-specialist-in-germany/how-to-get-started'
    }),
  defineFormat(europe, 'FR', 'French',
    'A dated experience timeline followed by concise education and skills sections.',
    { header: 'centered', entryStyle: 'date-column', entryOrder: 'newest-first', mainSections: ['Experience', 'Education', 'Skills'] },
    {
      convention: 'France Travail illustrates reverse chronological experience with dates on the left.',
      source: 'https://www.francetravail.fr/candidat/vos-recherches/preparer-votre-candidature/cv-lettre-de-motivation-e-mail/cv--des-exemples-pour-present-3.html'
    }),
  defineFormat(europe, 'NL', 'Dutch',
    'A short profile and career timeline, with skills and languages in a sidebar.',
    { header: 'inline', sidebarPosition: 'right', mainSections: ['Profile', 'Experience', 'Education'], sidebarSections: ['Skills', 'Languages'] }),
  defineFormat(europe, 'PT', 'Portuguese',
    'An experience-led layout with vocational training and education grouped together.',
    { header: 'ruled', fontFamily: 'serif', mainSections: ['Experience', 'Education and Training', 'Languages'] }),
  defineFormat(eurasia, 'RU', 'Russian',
    'A role-focused header with distinct work history and qualifications blocks.',
    { header: 'solid', entryStyle: 'date-column', mainSections: ['Target Role', 'Work History', 'Qualifications'] }),
  defineFormat(asia, 'CN', 'Chinese',
    'An education-led layout with dedicated blocks for projects and awards.',
    { header: 'tinted', entryStyle: 'grid', mainSections: ['Education', 'Projects', 'Experience', 'Awards'] }),
  defineFormat(asia, 'JP', 'Japanese',
    'A form-inspired layout with dated education and work histories and a qualifications block.',
    { header: 'centered', entryStyle: 'grid', entryOrder: 'oldest-first', mainSections: ['Education', 'Work History', 'Licenses and Qualifications'] },
    {
      convention: 'Japan’s ministry sample uses a dated grid for education and work history, plus a qualifications area.',
      source: 'https://www.hellowork.mhlw.go.jp/member/career_doc01.html'
    }),
  defineFormat(asia, 'KR', 'Korean',
    'A qualifications-first layout with a certifications and training sidebar.',
    { header: 'solid', sidebarPosition: 'right', mainSections: ['Qualifications', 'Education', 'Experience'], sidebarSections: ['Certificates', 'Training'] }),
  defineFormat(asia, 'IN', 'Indian',
    'An education and project portfolio, with technical skills alongside the main content.',
    { header: 'tinted', sidebarPosition: 'left', mainSections: ['Education', 'Projects', 'Experience'], sidebarSections: ['Technical Skills', 'Certifications'] }),
  defineFormat(oceania, 'AU', 'Australian',
    'A key-skills block ahead of work experience, with credentials in a separate sidebar.',
    { header: 'inline', sidebarPosition: 'right', mainSections: ['Key Skills', 'Work Experience'], sidebarSections: ['Education', 'Accreditations'] },
    {
      convention: 'Workforce Australia’s résumé planner includes a key skills block covering technical and employability skills.',
      source: 'https://www.workforceaustralia.gov.au/content/online-learning/course/what-needs-to-be-in-your-resume/assets/Resume%20planner.pdf'
    }),
  defineFormat(oceania, 'NZ', 'New Zealand',
    'A skills-focused CV with supporting examples before the employment record.',
    { header: 'plain', sectionStyle: 'open', mainSections: ['Skills and Examples', 'Work History', 'Qualifications'] },
    {
      convention: 'The New Zealand job hunters’ toolkit describes skills-focused and work-focused CV options.',
      source: 'https://knowyourskills.careers.govt.nz/assets/Uploads/how-to-write-a-CV.pdf'
    }),
  defineFormat(latinAmerica, 'BR', 'Brazilian',
    'A compact profile followed by experience, with courses and skills in a sidebar.',
    { header: 'centered', sidebarPosition: 'left', mainSections: ['Profile', 'Experience', 'Education'], sidebarSections: ['Courses', 'Skills'] }),
  defineFormat(latinAmerica, 'MX', 'Mexican',
    'An achievement-led layout with certifications and languages grouped at the end.',
    { header: 'solid', sectionStyle: 'open', mainSections: ['Profile', 'Achievements', 'Certifications', 'Languages'] }),
  defineFormat(africa, 'CV', 'Cape Verdean',
    'A training and experience timeline with dedicated space for languages.',
    { header: 'inline', entryStyle: 'date-column', mainSections: ['Training', 'Experience', 'Languages'] }),
  defineFormat(africa, 'ZA', 'South African',
    'Work and education history followed by language proficiency and references.',
    { header: 'tinted', mainSections: ['Employment History', 'Education', 'Languages', 'References'] },
    {
      convention: 'South African government guidance lists employment, education, language proficiency and references.',
      source: 'https://www.gov.za/issues/compiling-curriculum-vitae'
    }),
  defineFormat(middleEast, 'AE', 'UAE',
    'A summary and work-history layout with a sidebar for credentials and languages.',
    { header: 'ruled', sidebarPosition: 'right', mainSections: ['Summary', 'Experience'], sidebarSections: ['Credentials', 'Languages'] }),
  defineFormat(centralAsia, 'TM', 'Turkmen CV',
    'A target-role summary above a dated work and education history.',
    { header: 'centered', entryStyle: 'date-column', mainSections: ['Target Role', 'Work Experience', 'Education'] },
    {
      provisional: true,
      convention: 'Turkmenistan’s employment portal collects a desired role, education and work experience. The CV layout is provisional.',
      source: 'https://www.turkmenistan.gov.tm/index.php/tk/habar/102233/employment-tools-and-labor-market-prospects-2026'
    }),
  defineFormat(centralAsia, 'UZ', 'Uzbek CV',
    'A work-led layout with an achievements section and a skills and languages sidebar.',
    {
      header: 'tinted', sidebarPosition: 'right',
      mainSections: ['Work Experience', 'Education', 'Achievements'], sidebarSections: ['Skills', 'Languages']
    },
    {
      convention: 'Uzbek government résumé guidance includes recent work experience, education, skills and achievements such as projects or certificates.',
      source: 'https://gov.uz/uz/bv-navoiy/news/view/195321'
    }),
  defineFormat(centralAsia, 'KG', 'Kyrgyz CV',
    'A tabular CV with education and work history followed by language proficiency.',
    {
      header: 'ruled', entryStyle: 'grid', entryOrder: 'newest-first',
      mainSections: ['Education', 'Work History', 'Language Proficiency']
    },
    {
      convention: 'The Kyrgyz public-service regional reserve sample uses reverse chronological education and employment entries and records language proficiency.',
      source: 'https://mkk.gov.kg/wp-content/uploads/2021/07/%D0%BE%D0%B1%D1%80%D0%B0%D0%B7%D0%B5%D1%86-%D1%80%D0%B5%D0%B7%D1%8E%D0%BC%D0%B5-%D1%80%D1%83%D1%81%D1%81-%D0%A0%D0%B5%D0%B3%D0%B8%D0%BE%D0%BD%D0%B0%D0%BB%D1%8C%D0%BD%D1%8B%D0%B9-%D1%80%D0%B5%D0%B7%D0%B5%D1%80%D0%B2.pdf'
    })
]

export const getInternationalTargetId = ({ internationalFormat }) => internationalFormat.countryCode ?? internationalFormat.formatCode
