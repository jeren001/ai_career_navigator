import { CheckCircle2 } from 'lucide-react'

function ThumbnailSections({ sections }) {
  return sections.map(section => (
    <span className="cv-preview-section" key={section}>
      <strong>{section}</strong>
      <span className="cv-gallery-thumbnail-entry">
        <span className="cv-gallery-thumbnail-date" />
        <span className="cv-gallery-thumbnail-entry-text">
          <span className="cv-preview-line" />
          <span className="cv-preview-line medium" />
          <span className="cv-preview-line short" />
        </span>
      </span>
    </span>
  ))
}

export default function TemplateCard({ template, selected, onSelect }) {
  const { layout, internationalFormat } = template

  return (
    <button
      type="button"
      className={`cv-template-card${selected ? ' selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(template.id)}
    >
      {selected && (
        <span className="cv-template-selected" aria-hidden="true">
          <CheckCircle2 size={22} />
        </span>
      )}

      <span
        className="cv-template-preview cv-gallery-thumbnail"
        data-header={layout.header}
        data-entry-style={layout.entryStyle}
        data-section-style={layout.sectionStyle}
        style={{ '--template-color': layout.accent, fontFamily: layout.fontFamily }}
        aria-hidden="true"
      >
        <span className="cv-preview-header">
          <strong>Alex Morgan</strong>
          <small>Email · Phone · Location</small>
        </span>
        <span className="cv-gallery-thumbnail-body" data-sidebar={layout.sidebarPosition}>
          <span className="cv-gallery-thumbnail-column">
            <ThumbnailSections sections={layout.mainSections} />
          </span>
          {layout.sidebarSections.length > 0 && (
            <span className="cv-gallery-thumbnail-column cv-gallery-thumbnail-sidebar">
              <ThumbnailSections sections={layout.sidebarSections} />
            </span>
          )}
        </span>
      </span>

      <span className="cv-template-information">
        <span className="cv-template-name">{template.name}</span>
        {template.category && template.category !== template.name && (
          <span className="cv-gallery-category">{internationalFormat?.region ?? template.category}</span>
        )}
        {internationalFormat && (!internationalFormat.guidance || internationalFormat.guidance.provisional) && (
          <span className="cv-gallery-category">Provisional layout</span>
        )}
        <span className="cv-template-description">{template.description}</span>
      </span>
    </button>
  )
}
