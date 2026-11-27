import { useEffect, useRef, useState } from 'react'

const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxBytes = 5 * 1024 * 1024
const maxPixels = 16_000_000
const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

async function matchesImageType(file) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (file.type === 'image/png') return pngHeader.every((byte, index) => bytes[index] === byte)
  if (file.type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
}

function readPhoto(file, reader) {
  return new Promise((resolve, reject) => {
    reader.onerror = reader.onabort = reject
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        if (image.naturalWidth * image.naturalHeight > maxPixels) {
          reject(new RangeError('The photo must be 16 megapixels or smaller.'))
        } else {
          resolve({ src: reader.result, name: file.name })
        }
      }
      image.onerror = reject
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoSettings({ photo, showPhoto, onChange, onPendingChange }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pending = useRef(null)

  useEffect(() => () => {
    const reader = pending.current
    pending.current = null
    if (reader?.readyState === FileReader.LOADING) reader.abort()
    if (reader) onPendingChange(false)
  }, [onPendingChange])

  async function handleFile(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file || pending.current) return

    if (!imageTypes.includes(file.type) || file.size > maxBytes || file.size === 0) {
      setError('Choose a nonempty JPEG, PNG, or WebP image up to 5 MB.')
      return
    }

    setError('')
    setLoading(true)
    onPendingChange(true)
    const reader = new FileReader()
    pending.current = reader
    try {
      const matches = await matchesImageType(file)
      if (pending.current !== reader) return
      if (!matches) throw new Error('Image format mismatch')
      const image = await readPhoto(file, reader)
      if (pending.current === reader) onChange({ photo: image, showPhoto: photo ? showPhoto : true })
    } catch (failure) {
      if (pending.current === reader) setError(failure instanceof RangeError
        ? failure.message
        : 'This image could not be opened. Choose another file.')
    } finally {
      if (pending.current === reader) {
        pending.current = null
        setLoading(false)
        onPendingChange(false)
      }
    }
  }

  return (
    <fieldset className="cv-design-group">
      <legend>Profile photo</legend>
      <label className="cv-gallery-field">
        <span>{photo ? 'Change photo' : 'Add photo'}</span>
        <input type="file" accept={imageTypes.join(',')} onChange={handleFile} disabled={loading} />
      </label>
      <p>JPEG, PNG, or WebP up to 5 MB and 16 megapixels.</p>
      {loading && <p role="status">Opening image…</p>}
      {error && <p role="alert">{error}</p>}
      {photo && (
        <>
          <p dir="auto">{photo.name}</p>
          <label className="cv-design-checkbox">
            <input type="checkbox" checked={Boolean(showPhoto)} disabled={loading} onChange={event => onChange({ showPhoto: event.target.checked })} />
            Show photo on CV
          </label>
          <button type="button" className="cv-design-action" disabled={loading} onClick={() => { setError(''); onChange({ photo: null, showPhoto: false }) }}>
            Remove photo
          </button>
        </>
      )}
    </fieldset>
  )
}
