import { CalendarDays, File, Heading, Languages, MapPin, Phone, Text } from 'lucide-react'
import { documentLocales } from './documentLocales'
import { getLocalization } from './localizationUtils'

export default function FormatRecommendations({ guidelines, locale, currentPageSize }) {
  const { direction } = getLocalization({ locale })
  const language = documentLocales[locale]?.name ?? documentLocales.en.name
  const presets = guidelines?.presets
  const recommendations = [
    [File, 'Page size', presets?.pageSizes?.join(' or ') ?? `Keep ${currentPageSize}`],
    [CalendarDays, 'Date format', presets?.dateFormat === 'year-first' ? 'Year / month' : `Match ${language}`],
    [Heading, 'Section headings language', language],
    [Languages, 'Document labels language', language],
    [Phone, 'Phone format', 'Keep original'],
    [MapPin, 'Address format', 'Keep original'],
    [Text, 'Writing direction', direction === 'rtl' ? 'Right to left (RTL)' : 'Left to right (LTR)']
  ]

  return (
    <section className="cv-international-card">
      <h4>Recommended Settings</h4>
      <p>{presets ? 'Based on the selected language and available country guidance.' : 'Language defaults and current paper size. No verified country preset is available.'}</p>
      <dl className="cv-international-recommendations">
        {recommendations.map(([Icon, key, value]) => (
          <div key={key}>
            <dt><Icon size={16} aria-hidden="true" />{key}</dt>
            <dd dir="auto">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
