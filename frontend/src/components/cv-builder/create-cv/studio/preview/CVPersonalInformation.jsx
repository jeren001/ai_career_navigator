import { getDocumentContacts } from './documentContent'
import { CVText } from './CVSection'

export default function CVPersonalInformation({ information, photo, title, localization }) {
  const { fullName, jobTitle, careerLevel } = information
  const contacts = getDocumentContacts(information, localization)

  return (
    <header className="cv-document-header">
      <div className="cv-document-identity">
        {title && <CVText>{title}</CVText>}
        {photo && <img className="cv-document-photo" src={photo.src} alt={localization.label('photo')} />}
        {fullName?.trim() && <h2 dir="auto">{fullName}</h2>}
        <CVText>{jobTitle}</CVText>
        <CVText>{careerLevel}</CVText>
      </div>
      {Object.values(contacts).some(value => value?.trim()) && (
        <ul className="cv-document-contacts">
          {Object.entries(contacts).filter(([, value]) => value?.trim()).map(([key, value]) => (
            <li className="cv-document-text" key={key} dir={key === 'location' ? 'auto' : 'ltr'}>{value}</li>
          ))}
        </ul>
      )}
    </header>
  )
}
