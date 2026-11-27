import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { pageDimensions, resolveDesign } from '../design/designDefaults'
import { Download } from 'lucide-react'
import DOCXExportDialog from '../export/DOCXExportDialog'
import PDFExportDialog from '../export/PDFExportDialog'
import CVPaginationSource from './CVPaginationSource'
import PreviewPagination from './PreviewPagination'
import PreviewToolbar from './PreviewToolbar'
import useCVPagination from './useCVPagination'
import usePreviewFullscreen from './usePreviewFullscreen'

const millimetersToPixels = 96 / 25.4
const viewportGutter = 16

export default function CVPreview({ cvData, template, titleId, exportTitle }) {
  const design = useMemo(() => resolveDesign(template, cvData.design), [template, cvData.design])
  const [width, height] = pageDimensions[design.pageSize] ?? pageDimensions.A4
  const { result, source, staging } = useCVPagination(cvData, template.layout, design, height)
  const workspace = useRef(null)
  const viewport = useRef(null)
  const sheets = useRef(null)
  const currentPage = useRef(1)
  const [active, setActive] = useState(1)
  const [exportFormat, setExportFormat] = useState(null)
  const [mode, setMode] = useState('width')
  const [zoom, setZoom] = useState(100)
  const [space, setSpace] = useState({ width: 0, height: 0 })
  const { expanded, fallback, toggle } = usePreviewFullscreen(workspace)

  const numberOfPages = result && !result.continuous ? result.pages.length : 0
  const activePage = Math.min(active, Math.max(1, numberOfPages))
  const pageWidth = width * millimetersToPixels
  const pageHeight = height * millimetersToPixels
  const fitWidth = Math.max(0.05, (space.width - viewportGutter) / pageWidth)
  const fitPage = Math.min(fitWidth, Math.max(0.05, (space.height - viewportGutter) / pageHeight))
  const scale = mode === 'manual' ? zoom / 100 : mode === 'actual' ? 1 : mode === 'page' ? fitPage : fitWidth

  useEffect(() => {
    const element = viewport.current
    function update() {
      const next = { width: element.clientWidth, height: element.clientHeight }
      setSpace(previous => previous.width === next.width && previous.height === next.height ? previous : next)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function scrollToPage(index) {
    const element = sheets.current.children[index - 1]
    const scroller = viewport.current
    if (!element) return
    const top = element.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
    scroller.scrollTop = Math.max(0, top - viewportGutter / 2)
  }

  useLayoutEffect(() => {
    const list = sheets.current
    const elements = result?.pages.map((page, index) => {
      const sheet = document.createElement('div')
      const frame = document.createElement('div')
      sheet.className = 'cv-preview-sheet'
      frame.className = 'cv-document-frame'
      page.setAttribute('aria-label', result.continuous ? 'CV document' : `CV page ${index + 1} of ${result.pages.length}`)
      frame.append(page)
      sheet.append(frame)
      return sheet
    }) ?? []
    list.replaceChildren(...elements)
    if (result?.continuous) {
      const frame = list.firstElementChild.firstElementChild
      list.firstElementChild.style.setProperty('--cv-preview-sheet-height', `${frame.offsetHeight}px`)
    }
  }, [result])

  useLayoutEffect(() => {
    if (!result) return
    const page = Math.min(currentPage.current, Math.max(1, numberOfPages))
    currentPage.current = page
    setActive(page)
    scrollToPage(page)
  }, [result, numberOfPages, scale, expanded])

  function navigate(page) {
    const target = Math.min(numberOfPages, Math.max(1, page))
    if (target < 1) return
    currentPage.current = target
    setActive(target)
    scrollToPage(target)
  }

  function trackScroll() {
    if (!numberOfPages) return
    const element = viewport.current
    const top = element.getBoundingClientRect().top + viewportGutter / 2 + 1
    const last = element.scrollHeight - element.clientHeight - element.scrollTop <= 1
    let index = 1
    if (last && element.scrollHeight > element.clientHeight) index = numberOfPages
    else {
      for (const sheet of sheets.current.children) {
        if (sheet.getBoundingClientRect().bottom > top) break
        index++
      }
    }
    index = Math.min(index, numberOfPages)
    currentPage.current = index
    setActive(index)
  }

  function handlePageKey(event) {
    if (event.target !== event.currentTarget || !numberOfPages) return
    const destinations = { Home: 1, End: numberOfPages, ArrowLeft: activePage - 1, ArrowRight: activePage + 1 }
    if (!(event.key in destinations)) return
    event.preventDefault()
    navigate(destinations[event.key])
  }

  return (
    <aside
      ref={workspace}
      className="cv-studio-preview"
      data-expanded={expanded || undefined}
      data-overlay={fallback || undefined}
      role={fallback ? 'dialog' : undefined}
      aria-modal={fallback || undefined}
      aria-labelledby={titleId}
    >
      <h3 id={titleId}>Live Preview</h3>
      <p className="cv-studio-preview-caption" role="status">
        {design.pageSize}{!result ? ' · Preparing pages…' : result.continuous ? ' · Continuous preview. A content block could not be paginated.' : ''}
      </p>
      <PreviewToolbar mode={mode} zoom={zoom} scale={scale} expanded={expanded}
        onZoom={value => { setZoom(value); setMode('manual') }}
        onMode={setMode} onFullscreen={toggle} />
      {numberOfPages > 0 && <PreviewPagination current={activePage} total={numberOfPages} onNavigate={navigate} />}

      <div className="cv-preview-controls">
        <button type="button" onClick={() => setExportFormat('pdf')}>
          <Download size={17} aria-hidden="true" /> Download PDF
        </button>
        <button type="button" onClick={() => setExportFormat('docx')}>
          <Download size={17} aria-hidden="true" /> Download DOCX
        </button>
      </div>
      {exportFormat === 'pdf' && (
        <PDFExportDialog title={exportTitle} result={result} width={width} height={height} onClose={() => setExportFormat(null)} />
      )}

      {exportFormat === 'docx' && (
        <DOCXExportDialog title={exportTitle} cvData={cvData} onClose={() => setExportFormat(null)} />
      )}

      <CVPaginationSource cvData={cvData} layout={template.layout} design={design} width={width} source={source} staging={staging} />
      <div ref={viewport} className="cv-preview-viewport" role="region" aria-label="CV page viewport" tabIndex={0}
        onScroll={trackScroll} onKeyDown={handlePageKey}
        data-continuous={result?.continuous || undefined}
        data-multiple={numberOfPages > 1 || undefined}
        style={{ '--cv-preview-scale': scale, '--cv-preview-viewport-height': `${space.height}px`, '--cv-preview-width': `${pageWidth}px`, '--cv-preview-height': `${pageHeight}px` }}>
        <div ref={sheets} className="cv-preview-sheets" />
      </div>
    </aside>
  )
}
