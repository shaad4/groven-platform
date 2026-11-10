import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

const RAIL_TONES = {
  neutral: '#2A332E',
  accent: '#1D9E75',
  danger: '#E2483D',
}

export default function AdminSlidePanel({
  open,
  onClose,
  width = 480,
  tone = 'neutral',
  children,
}) {
  const [mounted, setMounted] = useState(open)
  const [animateIn, setAnimateIn] = useState(false)
  const dialogRef = useDialogFocus(mounted, onClose)

  useEffect(() => {
    if (open) {
      setMounted(true)
      const raf = requestAnimationFrame(() => setAnimateIn(true))
      return () => cancelAnimationFrame(raf)
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setMounted(false), 240)
      return () => clearTimeout(t)
    }
  }, [open])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Scrim */}
      <div
        className={`absolute inset-0 bg-[#040806]/60 backdrop-blur-[2px] transition-opacity duration-200 ${
          animateIn ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        ref={dialogRef}
        tabIndex={-1}
        aria-modal="true"
        style={{ '--panel-width': `${width}px` }}
        className={`absolute right-0 top-0 h-full bg-surface shadow-[-24px_0_60px_rgba(4,8,6,0.25)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] w-full sm:w-[var(--panel-width)] ${
          animateIn ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Severity rail */}
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: RAIL_TONES[tone] }}
        />

        <div className="flex h-full flex-col overflow-hidden pl-[3px]">
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Shared panel chrome ────────────────────────────────────

export function PanelHeader({ eyebrow, title, subtitle, onClose }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5 shrink-0">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-text-dim">
            {eyebrow}
          </p>
        )}
        <h2 className="truncate text-[18px] font-semibold text-text-main">{title}</h2>
        {subtitle && <p className="mt-1 text-[13px] text-text-sub">{subtitle}</p>}
      </div>
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-dim hover:bg-surface hover:text-text-main transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function PanelBody({ children }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      {children}
    </div>
  )
}

export function PanelFooter({ children }) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-border bg-layout-card px-6 py-4 shrink-0">
      {children}
    </div>
  )
}
