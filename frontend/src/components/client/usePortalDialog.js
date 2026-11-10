import { useEffect, useRef } from 'react'

/** Keyboard containment and focus restoration for portal sheets and dialogs. */
export default function usePortalDialog(open, onClose) {
  const dialogRef = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open || !dialogRef.current) return
    const previous = document.activeElement
    const dialog = dialogRef.current
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]'
    const focusable = () => Array.from(dialog.querySelectorAll(selector)).filter(element => element.getClientRects().length)
    ;(focusable()[0] || dialog).focus()
    const onKeyDown = event => {
      const topDialog = Array.from(document.querySelectorAll('[role="dialog"]')).at(-1)
      if (topDialog !== dialog) return
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.() }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) { event.preventDefault(); dialog.focus(); return }
      const first = elements[0], last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('keydown', onKeyDown); if (previous?.isConnected) previous.focus() }
  }, [open])
  return dialogRef
}
