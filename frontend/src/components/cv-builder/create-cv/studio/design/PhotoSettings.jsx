import { useEffect, useRef, useState } from 'react'

const imageTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxBytes = 5 * 1024 * 1024

function readPhoto(file, reader) {
  return new Promise((resolve, reject) => {
    reader.onerror = reader.onabort = reject
    reader.onload = () => {
      const image = new Image()
      image.onload = () => resolve({ src: reader.result, name: file.name })
      image.onerror = reject
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

export default function PhotoSettings({ photo, showPhoto, onChange }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const pending = useRef(null)

  useEffect(() => () => {
    const reader = pending.current
    pending.current = null
    if (reader?.readyState === FileReader.LOADING) reader.abort()
  }, [])

  async function handleFile(event) {
    const file = event.target.files[0]
    event.target.value = ''
    if (!file) return

    if (!imageTypes.includes(file.type) || file.size > maxBytes || file.size === 0) {
      setError('Choose a nonempty JPEG, PNG, or WebP image up to 5 MB.')
      return
    }

    setError('')
    setLoading(true)
    const reader = new FileReader()
    pending.current = reader
    try {
      const image = await readPhoto(file, reader)
      if (pending.current === reader) onChange({ photo: image, showPhoto: photo ? showPhoto : true })
    } catch {
      if (pending.current === reader) setError('This image could not be opened. Choose another file.')
    } finally {
      if (pending.current === reader) {
        pending.current = null
        setLoading(false)
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
      <p>JPEG, PNG, or WebP up to 5 MB.</p>
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
