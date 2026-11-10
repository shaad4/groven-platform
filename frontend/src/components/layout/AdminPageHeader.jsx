import { RefreshCw } from 'lucide-react'

export default function AdminPageHeader({ title, subtitle, onRefresh, refreshing }) {
  return (
    <div className="flex items-start justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
      <div>
        <h1 className="text-2xl sm:text-[30px] font-semibold tracking-tight text-text-main">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] sm:text-[14px] text-text-sub">{subtitle}</p>}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          aria-label="Refresh page"
          disabled={refreshing}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border bg-layout-card px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-text-sub hover:bg-surface transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}
    </div>
  )
}