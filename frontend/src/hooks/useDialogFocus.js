import { useEffect, useRef } from 'react'

const focusableSelector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Keeps keyboard interaction inside an open overlay and restores its trigger.
export function useDialogFocus(open, onClose) {
  const ref = useRef(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const frame = requestAnimationFrame(() => {
      const dialog = ref.current
      if (!dialog) return
      const heading = dialog.querySelector('h1,h2,h3')
      if (!dialog.hasAttribute('aria-label') && !dialog.hasAttribute('aria-labelledby') && heading) dialog.setAttribute('aria-label', heading.textContent)
      const first = [...dialog.querySelectorAll(focusableSelector)].filter(el => el.getClientRects().length).find(el => el.hasAttribute('autofocus')) || [...dialog.querySelectorAll(focusableSelector)].find(el => el.getClientRects().length)
      ;(first || dialog).focus()
    })
    const onKeyDown = (event) => {
      const dialog = ref.current
      if (!dialog) return
      // Only the topmost dialog handles the keyboard when panels are nested.
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')].filter(node => node.getClientRects().length)
      if (dialogs.length && dialogs[dialogs.length - 1] !== dialog) return
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current?.(); return }
      if (event.key !== 'Tab') return
      const items = [...dialog.querySelectorAll(focusableSelector)].filter(el => el.getClientRects().length)
      const first = items[0], last = items[items.length - 1]
      if (!first) { event.preventDefault(); dialog.focus(); return }
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus()
    }
  }, [open])
  return ref
}
