export function CVText({ children }) {
  return children?.trim() ? <p className="cv-document-text" dir="auto">{children}</p> : null
}

export default function CVSection({ title, children }) {
  return (
    <section className="cv-document-section">
      <h3 dir="auto">{title}</h3>
      {children}
    </section>
  )
}
