import { memo, useEffect, useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import CVDocument from '../create-cv/studio/preview/CVDocument'
import { getSavedDocument } from '../create-cv/studio/preview/savedDocument'
import { pageDimensions } from '../create-cv/studio/design/designDefaults'

function CVThumbnail({ cv }) {
  const container = useRef(null)
  const [available, setAvailable] = useState(null)

  useEffect(() => {
    const element = container.current
    let observer
    function measure() {
      setAvailable({ width: element.clientWidth, height: element.clientHeight })
    }

    const visibility = new IntersectionObserver(([entry]) => {
      observer?.disconnect()
      if (entry.isIntersecting && cv.data) {
        measure()
        observer = new ResizeObserver(measure)
        observer.observe(element)
      } else {
        setAvailable(null)
      }
    }, { rootMargin: '120px' })
    visibility.observe(element)
    return () => { visibility.disconnect(); observer?.disconnect() }
  }, [cv.data])

  const document = available?.width && cv.data ? getSavedDocument(cv) : null
  const [width, height] = document ? pageDimensions[document.design.pageSize] ?? pageDimensions.A4 : []
  const scale = document ? Math.min(available.width / width, available.height / height) * 25.4 / 96 * 0.92 : 0

  return (
    <div ref={container} className="cv-card-preview cv-card-thumbnail" aria-hidden="true">
      {document ? (
        <div className="cv-thumbnail-sheet" style={{ width: `calc(${width}mm * ${scale})`, height: `calc(${height}mm * ${scale})` }}>
          <div className="cv-thumbnail-document" style={{ width: `${width}mm`, transform: `scale(${scale})` }}>
            <CVDocument cvData={document.cvData} layout={document.template.layout} design={document.design} />
          </div>
        </div>
      ) : <FileText size={48} strokeWidth={1.2} />}
    </div>
  )
}

export default memo(CVThumbnail)
