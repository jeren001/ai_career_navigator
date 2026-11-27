import { formatDocumentAddress } from '../international/localizationUtils'
import { getHistoryRange, orderHistory } from './documentContent'
import { CVText } from './CVSection'

export default function CVHistory({ entries, studying = false, order, localization }) {
  const ordered = orderHistory(entries, order)

  return (
    <ul className="cv-document-history">
      {ordered.map(entry => (
        <li key={entry.id} className="cv-document-entry">
          <CVText>{getHistoryRange(entry, studying ? entry.currentlyStudying : entry.currentlyWorking, studying, localization)}</CVText>
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
