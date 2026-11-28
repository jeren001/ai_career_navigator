const encoder = new TextEncoder()

export function exportFilename(value, extension) {
  const name = value.trim().replace(new RegExp(`\\.${extension}$`, 'i'), '')
    .replace(/[\p{Cc}\p{Bidi_Control}]/gu, '')
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/^[. ]+|[. ]+$/g, '')
  if (!name) return ''

  const safeName = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)
    ? `_${name}`
    : name
  let base = ''
  let bytes = 0
  for (const character of safeName) {
    bytes += encoder.encode(character).length
    if (bytes > 240 - extension.length - 1) break
    base += character
  }
  return `${base.replace(/[. ]+$/g, '')}.${extension}`
}
