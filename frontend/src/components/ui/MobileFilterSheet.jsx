import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

export default function MobileFilterSheet({ open, onClose, title = 'Filters', children, onReset, id }) {
  const titleId = useId()
  const dialogRef = useDialogFocus(open, onClose)
  useEffect(() => {
    if (!open) return
    const desktop = window.matchMedia('(min-width: 768px)')
    const closeOnDesktop = () => { if (desktop.matches) onClose() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [open, onClose])
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-end md:hidden">
      <div aria-hidden="true" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <section ref={dialogRef} id={id} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="relative flex max-h-[90dvh] w-full flex-col rounded-t-3xl border border-border bg-layout-card text-text-main shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3"><h2 id={titleId} className="text-base font-semibold">{title}</h2><button type="button" aria-label={`Close ${title.toLowerCase()}`} onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl text-text-sub hover:bg-surface"><X size={20} aria-hidden="true" /></button></div>
        <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>
        <div className="flex shrink-0 items-center gap-3 border-t border-border px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {onReset && <button type="button" onClick={onReset} className="min-h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface">Reset</button>}
          <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-xl bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary-dark">Done</button>
        </div>
      </section>
    </div>, document.body,
  )
}
