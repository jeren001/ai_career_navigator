import { useLayoutEffect, useRef, useState } from 'react'
import { paginateDocument } from './paginationUtils'

function waitForImages(root) {
  return Promise.all([...root.querySelectorAll('img')].map(image => image.decode().catch(() => {})))
}

export default function useCVPagination(cvData, layout, design, height) {
  const source = useRef(null)
  const staging = useRef(null)
  const [result, setResult] = useState(null)

  useLayoutEffect(() => {
    let current = true
    const documentNode = source.current.querySelector('.cv-document')

    async function measure() {
      await Promise.all([document.fonts?.ready, waitForImages(documentNode)])
      if (!current) return
      try {
        setResult({ cvData, layout, design, pages: paginateDocument(documentNode, staging.current, `${height}mm`) })
      } catch {
        setResult({ cvData, layout, design, pages: [documentNode.cloneNode(true)], continuous: true })
      }
    }

    measure()
    return () => { current = false }
  }, [cvData, layout, design, height])

  const ready = result?.cvData === cvData && result.layout === layout && result.design === design
  return { source, staging, result: ready ? result : null }
}
