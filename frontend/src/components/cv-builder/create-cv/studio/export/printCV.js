import documentStyles from '../preview/cv-document.css?inline'

import { exportFilename } from './exportFilename'

export const pdfFilename = value => exportFilename(value, 'pdf')

function printStyles(width, height) {
  return `
    @page { size: ${width}mm ${height}mm; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    ${documentStyles}
    .cv-export-sheet {
      inline-size: ${width}mm;
      block-size: ${height}mm;
      break-inside: avoid;
    }
    .cv-export-sheet:not(:last-child) { break-after: page; }
    .cv-export-sheet .cv-document {
      box-shadow: none;
      border-color: transparent;
      break-inside: avoid;
    }
  `
}

async function waitForPrintResources(doc) {
  await Promise.all([
    doc.fonts?.ready,
    ...[...doc.images].map(image => image.decode())
  ])
}

// Open from a user gesture. The browser prints real DOM text on the measured sheets.
export async function printCV({ pages, width, height, filename, onPrintClosed }) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) throw new Error('Allow pop-ups for this site, then try exporting again.')

  try {
    const doc = printWindow.document
    printWindow.opener = null
    doc.title = filename.replace(/\.pdf$/i, '')
    doc.documentElement.lang = pages[0].lang || 'en'
    const styles = doc.createElement('style')
    styles.textContent = printStyles(width, height)
    doc.head.append(styles)

    const sheets = pages.map(page => {
      const frame = doc.createElement('div')
      frame.className = 'cv-document-frame cv-export-sheet'
      frame.append(doc.importNode(page, true))
      return frame
    })
    doc.body.replaceChildren(...sheets)
    await waitForPrintResources(doc)

    if (printWindow.closed) throw new Error('The export window was closed before the PDF was ready.')
    if (typeof printWindow.print !== 'function') throw new Error('This browser cannot open the print dialog.')
    printWindow.addEventListener('afterprint', onPrintClosed, { once: true })
    printWindow.focus()
    printWindow.print()
  } catch (error) {
    if (!printWindow.closed) printWindow.close()
    throw error
  }
}
