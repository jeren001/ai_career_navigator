import { useCallback, useEffect, useState } from 'react'

export default function usePreviewFullscreen(workspace) {
  const [expanded, setExpanded] = useState(false)
  const [fallback, setFallback] = useState(false)

  const restoreFocus = useCallback(() => {
    requestAnimationFrame(() => workspace.current?.querySelector('[data-preview-fullscreen]')?.focus())
  }, [workspace])

  async function toggle() {
    const element = workspace.current
    if (fallback) {
      setFallback(false)
      setExpanded(false)
      restoreFocus()
    } else if (document.fullscreenElement === element) {
      await document.exitFullscreen()
    } else {
      try {
        if (!element.requestFullscreen) throw new Error('Fullscreen API unavailable')
        await element.requestFullscreen()
      } catch {
        if (workspace.current !== element) return
        setFallback(true)
        setExpanded(true)
      }
    }
  }

  useEffect(() => {
    const element = workspace.current
    function handleFullscreenChange() {
      const fullscreen = document.fullscreenElement === element
      setExpanded(fullscreen)
      if (!fullscreen) restoreFocus()
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [workspace, restoreFocus])

  useEffect(() => {
    if (!fallback) return
    const element = workspace.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.querySelector('[data-preview-fullscreen]')?.focus()

    function handleKey(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        setFallback(false)
        setExpanded(false)
        restoreFocus()
      }
      if (event.key === 'Tab') {
        const controls = [...element.querySelectorAll('button:not(:disabled), select:not(:disabled), [tabindex="0"]')]
        const edge = event.shiftKey ? controls[0] : controls.at(-1)
        if (!element.contains(document.activeElement) || document.activeElement === edge) {
          event.preventDefault()
          const next = event.shiftKey ? controls.at(-1) : controls[0]
          next?.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKey)
    }
  }, [fallback, workspace, restoreFocus])

  return { expanded, fallback, toggle }
}
