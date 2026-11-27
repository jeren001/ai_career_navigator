const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null

function characterBounds(value, index) {
  const betweenPair = /[\uDC00-\uDFFF]/.test(value[index]) && /[\uD800-\uDBFF]/.test(value[index - 1])
  const start = betweenPair ? index - 1 : index
  return [start, start + (value.codePointAt(start) > 0xffff ? 2 : 1)]
}

function splitText(node, fits) {
  const value = node.data
  const segments = segmenter?.segment(value)
  function bounds(index) {
    const segment = segments?.containing(index)
    return segment ? [segment.index, segment.index + segment.segment.length] : characterBounds(value, index)
  }

  let low = 0
  let high = value.length
  const trial = node.cloneNode()
  // Probe rendered prefixes by grapheme boundary without enumerating the whole
  // remaining paragraph on each continuation page.
  while (low < high) {
    const middle = Math.ceil((low + high) / 2)
    const [start, end] = bounds(middle - 1)
    trial.data = value.slice(0, end)
    if (fits(trial)) low = end
    else high = start
  }

  if (!low) return null
  let cut = low
  const preceding = value.slice(0, cut)
  const wordBoundary = preceding.search(/\s[^\s]{1,24}$/u)
  if (wordBoundary > 0 && bounds(wordBoundary)[1] === wordBoundary + 1) cut = wordBoundary + 1

  return [document.createTextNode(value.slice(0, cut)), document.createTextNode(value.slice(cut))]
}

function isAtomic(node) {
  return node.nodeType === Node.TEXT_NODE || node.matches?.('p, li, h2, h3, img, bdi, strong')
}

function hasBody(fragment) {
  // Keep a heading with its first content block. Continuations have no repeated heading.
  const first = fragment.firstElementChild
  if (fragment.matches('section') && first?.matches('h3')) return Boolean(first.nextElementSibling)
  return Boolean(fragment.childNodes.length)
}

function splitNode(node, fits, force) {
  if (isAtomic(node) && !force) return null
  if (node.nodeType === Node.TEXT_NODE) return splitText(node, fits)
  if (!node.hasChildNodes()) return null

  const head = node.cloneNode(false)
  const tail = node.cloneNode(false)
  const children = [...node.childNodes]

  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    const copy = child.cloneNode(true)
    head.append(copy)
    if (fits(head)) continue
    copy.remove()

    // Once an entry or paragraph fits, move the next one intact to the next page.
    const canBreakChild = force && !hasBody(head)
    const parts = splitNode(child, prefix => {
      head.append(prefix)
      const result = fits(head)
      prefix.remove()
      return result
    }, canBreakChild)
    if (parts) {
      head.append(parts[0])
      if (parts[1].textContent || parts[1].hasChildNodes()) tail.append(parts[1])
    } else {
      tail.append(copy)
    }
    tail.append(...children.slice(index + 1).map(item => item.cloneNode(true)))
    return hasBody(head) ? [head, tail] : null
  }
  return null
}

function fitsPage(page) {
  const rect = page.getBoundingClientRect()
  const style = getComputedStyle(page)
  const bottom = rect.bottom - parseFloat(style.paddingBlockEnd) - parseFloat(style.borderBlockEndWidth)
  const columnContents = [...page.querySelector('.cv-document-columns').children]
  const header = page.querySelector(':scope > .cv-document-header')
  const columns = page.querySelector('.cv-document-columns')
  return [
    ...(header ? [header] : []),
    ...(columnContents.some(column => column.childElementCount) ? [columns] : [])
  ].every(element => element.getBoundingClientRect().bottom <= bottom + 0.02)
}

function place(page, container, node) {
  container.append(node)
  if (fitsPage(page)) return true
  node.remove()
  return false
}

// Measure complete, fixed-size page surfaces. Each column flows independently;
// continuation pages keep their original column widths and never repeat the masthead.
export function paginateDocument(source, staging, pageHeight) {
  const sourceColumns = source.querySelector('.cv-document-columns')
  const sourceGroups = [...sourceColumns.children]
  const pages = []

  function getPage(index) {
    if (!pages[index]) {
      const page = source.cloneNode(false)
      page.classList.add('cv-document-paginated')
      page.style.blockSize = pageHeight
      const columns = sourceColumns.cloneNode(false)
      columns.append(...sourceGroups.map(group => group.cloneNode(false)))
      page.append(columns)
      staging.replaceChildren(page)
      pages.push({ page, columns })
    } else {
      staging.replaceChildren(pages[index].page)
    }
    return pages[index]
  }

  try {
    let firstContentPage = 0
    let header = source.querySelector(':scope > .cv-document-header')?.cloneNode(true)
    while (header) {
      const { page, columns } = getPage(firstContentPage)
      columns.before(header)
      if (fitsPage(page)) break
      header.remove()
      const parts = splitNode(header, candidate => {
        columns.before(candidate)
        const fits = fitsPage(page)
        candidate.remove()
        return fits
      }, true)
      if (!parts) throw new Error('Masthead cannot fit the page')
      columns.before(parts[0])
      header = parts[1]
      firstContentPage++
    }

    if (!pages.length) getPage(0)

    for (const [groupIndex, group] of sourceGroups.entries()) {
      let pageIndex = firstContentPage
      for (const section of group.children) {
        let remaining = section.cloneNode(true)
        while (remaining) {
          const { page, columns } = getPage(pageIndex)
          const target = columns.children[groupIndex]
          if (place(page, target, remaining)) break

          const fits = candidate => {
            const result = place(page, target, candidate)
            if (result) candidate.remove()
            return result
          }
          const emptyPage = !target.childElementCount && !page.querySelector(':scope > .cv-document-header')
          let parts = splitNode(remaining, fits, emptyPage)
          if (!parts && !target.childElementCount && !emptyPage) {
            // Only split on the masthead page if the first unit also needs
            // splitting on a fresh page. Otherwise move it as a whole.
            const probe = page.cloneNode(true)
            probe.querySelector(':scope > .cv-document-header').remove()
            const probeGroups = probe.querySelector('.cv-document-columns').children
            for (const column of probeGroups) column.replaceChildren()
            staging.replaceChildren(probe)
            const fitsFresh = candidate => {
              const result = place(probe, probeGroups[groupIndex], candidate)
              if (result) candidate.remove()
              return result
            }
            const needsSplit = !fitsFresh(remaining) && !splitNode(remaining, fitsFresh, false)
            staging.replaceChildren(page)
            if (needsSplit) parts = splitNode(remaining, fits, true)
          }
          if (parts) {
            target.append(parts[0])
            remaining = parts[1]
          } else if (emptyPage) {
            // A non-splittable block larger than an empty page must not be lost.
            throw new Error('A document block cannot fit the page')
          }
          pageIndex++
        }
      }
    }
    return pages.map(({ page }) => page)
  } finally {
    staging.replaceChildren()
  }
}
