import { useEffect, useId, useRef, useState } from 'react'
import { Menu, X } from 'lucide-react'
import ThemeToggle from '../ui/ThemeToggle'

export default function AppearanceMenu({ className = '' }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return undefined
    const handlePointer = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false)
    }
    const handleKey = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  const handleSelection = event => {
    if (!event.target.closest('button')) return
    setOpen(false)
    buttonRef.current?.focus()
  }

  return (
    <div ref={containerRef} className={`relative ${className}`} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
    }}>
      <button ref={buttonRef} type="button" aria-label={open ? 'Close appearance menu' : 'Open appearance menu'} aria-expanded={open} aria-controls={panelId} aria-haspopup="dialog" onClick={() => setOpen(value => !value)} className="flex h-10 w-10 items-center justify-center rounded-lg text-text-sub transition-colors hover:bg-surface hover:text-text-main">
        {open ? <X size={19} /> : <Menu size={19} />}
      </button>
      {open && (
        <div id={panelId} role="dialog" aria-label="Appearance" className="absolute right-0 top-full z-[60] mt-2 w-max max-w-[calc(100vw-40px)] rounded-xl border border-border bg-layout-card p-4 shadow-sm">
          <p className="mb-3 text-xs font-medium text-text-sub">Appearance</p>
          <div onClick={handleSelection}><ThemeToggle /></div>
        </div>
      )}
    </div>
  )
}
