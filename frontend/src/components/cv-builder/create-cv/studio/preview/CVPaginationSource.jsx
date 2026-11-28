import CVDocument from './CVDocument'

export default function CVPaginationSource({ cvData, layout, design, width, source, staging }) {
  return (
    <div className="cv-preview-measurement" aria-hidden="true" inert style={{ width: `${width}mm` }}>
      <div ref={source}><CVDocument cvData={cvData} layout={layout} design={design} /></div>
      <div ref={staging} className="cv-document-frame" />
    </div>
  )
}
