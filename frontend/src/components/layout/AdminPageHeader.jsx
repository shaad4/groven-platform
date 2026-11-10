import { RefreshCw } from 'lucide-react'

export default function AdminPageHeader({ title, subtitle, onRefresh, refreshing }) {
  return (
    <div className="flex items-start justify-between px-4 sm:px-8 pt-6 sm:pt-8 pb-4 sm:pb-6">
      <div>
        <h1 className="text-[20px] sm:text-[24px] font-semibold text-[#10241C]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] sm:text-[14px] text-[#7C867D]">{subtitle}</p>}
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-[#D8DCD8] bg-white px-3 py-1.5 sm:px-3.5 sm:py-2 text-[12px] sm:text-[13px] font-medium text-[#5B655C] hover:bg-[#F3F5F3] transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      )}
    </div>
  )
}