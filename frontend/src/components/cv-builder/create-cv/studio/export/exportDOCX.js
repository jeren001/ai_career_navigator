import { Packer } from 'docx'
import { renderWordDocument } from './docxTemplateRenderer'

export async function exportDOCX(cvData, filename, signal) {
  const document = await renderWordDocument(cvData, filename.replace(/\.docx$/i, ''))
  const blob = await Packer.toBlob(document)
  if (signal.aborted) return false

  const url = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  link.href = url
  link.download = filename
  window.document.body.append(link)
  try {
    link.click()
  } finally {
    link.remove()
    // Give the browser time to read the Blob after the click.
    window.setTimeout(() => URL.revokeObjectURL(url), 30000)
  }
  return true
}
