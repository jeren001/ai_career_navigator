import { formatDocumentAddress, formatDocumentDate } from '../international/localizationUtils'
import { CVText } from './CVSection'

function formatRange({ startDate, endDate }, active, studying, localization) {
  const start = formatDocumentDate(startDate, localization)
  const end = formatDocumentDate(endDate, localization)
  if (active) {
    const current = [start, localization.label('present')].filter(Boolean).join(' – ')
    return studying && end ? `${current} (${localization.label('expected')} ${end})` : current
  }
  return [start, end].filter(Boolean).join(' – ')
}

export default function CVHistory({ entries, studying = false, order, localization }) {
  const ordered = order
    ? [...entries].sort((first, second) => {
        const dateOrder = (first.startDate || '').localeCompare(second.startDate || '')
        return order === 'newest-first' ? -dateOrder : dateOrder
      })
    : entries

  return (
    <ul className="cv-document-history">
      {ordered.map(entry => (
        <li key={entry.id} className="cv-document-entry">
          <CVText>{formatRange(entry, studying ? entry.currentlyStudying : entry.currentlyWorking, studying, localization)}</CVText>
          <div className="cv-document-entry-body">
            <strong dir="auto">{studying ? entry.degree : entry.jobTitle}</strong>
            <CVText>{studying ? entry.institution : entry.company}</CVText>
            <CVText>{studying ? entry.fieldOfStudy : entry.employmentType}</CVText>
            <CVText>{formatDocumentAddress(entry.location, localization.addressFormat)}</CVText>
            {studying && entry.grade?.trim() && <p>{localization.label('grade')} <bdi>{entry.grade}</bdi></p>}
            <CVText>{entry.description}</CVText>
          </div>
        </li>
      ))}
    </ul>
  )
}
