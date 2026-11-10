import { useState, useEffect, useRef, useCallback } from 'react'

export function usePanelResize({
  storageKey = 'grove-panel-width',
  initialWidth = 360,
  minWidth = 240,
  maxWidth = 600,
  direction = 'right', // 'right' | 'left'
}) {
  const [width, setWidth] = useState(() => {
    const saved = localStorage.getItem(storageKey)

    if (!saved) return initialWidth

    const parsed = Number(saved)

    if (Number.isNaN(parsed)) return initialWidth

    return Math.max(minWidth, Math.min(maxWidth, parsed))
  })

  const dragging = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(width)

  const onMouseDown = useCallback(
    (e) => {
      e.preventDefault()

      dragging.current = true
      startX.current = e.clientX
      startWidth.current = width

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [width]
  )

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return

      const delta =
        direction === 'right'
          ? startX.current - e.clientX
          : e.clientX - startX.current

      const next = Math.max(
        minWidth,
        Math.min(maxWidth, startWidth.current + delta)
      )

      setWidth(next)
    }

    const onMouseUp = () => {
      if (!dragging.current) return

      dragging.current = false

      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [minWidth, maxWidth, direction])

  useEffect(() => {
    localStorage.setItem(storageKey, String(width))
  }, [width, storageKey])

  return {
    width,
    onMouseDown,
  }
}