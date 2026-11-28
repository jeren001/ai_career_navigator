export default function TemplatePagination({ page, pageCount, onChange }) {
  if (pageCount <= 1) return null

  return (
    <nav className="cv-gallery-pagination" aria-label="Template pages">
      <button type="button" disabled={page === 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span>Page {page} of {pageCount}</span>
      <button type="button" disabled={page === pageCount} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  )
}
