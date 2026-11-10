import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

export default function Button({ children, loading, disabled, className, icon: Icon, variant = 'primary', ...props }) {
  return (
    <button
      className={clsx(
        'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors',
        variant === 'primary' ? 'bg-primary text-on-primary hover:bg-primary-dark' : 'border border-border bg-layout-card text-text-main hover:bg-surface',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className
      )}
      {...props}
      disabled={loading || disabled}
      aria-busy={loading || undefined}
    >
      {loading ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : Icon && <Icon size={16} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
}
