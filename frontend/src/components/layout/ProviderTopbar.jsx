import { Plus } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'

export default function ProviderTopbar({
  title,
  onAddClient,
  showAddBtn = true,
  liveIndicator = false,
  actions,
  rightSlot,
}) {
  return (
    <header className="flex h-[64px] items-center justify-between border-b border-[#e8eae8] bg-white px-6 shrink-0">
      <h1 className="text-[20px] font-semibold text-[#141a14]">{title}</h1>

      <div className="flex items-center gap-3">
        {liveIndicator && (
          <div className="flex items-center gap-2 rounded-full bg-[#e6f5f0] px-3 py-1">
            <div className="h-2 w-2 rounded-full bg-[#1d9e75] animate-pulse" />
            <span className="text-[12px] font-medium text-[#0f6e56]">Live</span>
          </div>
        )}

        {actions}

        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}

        <NotificationBell />

        {showAddBtn && onAddClient && (
          <button
            onClick={onAddClient}
            className="flex items-center gap-2 rounded-xl bg-[#0f6e56] px-5 py-2.5 text-[13px] font-medium text-white hover:bg-[#0c5b47] transition-colors"
          >
            <Plus size={15} />
            Add client
          </button>
        )}
      </div>
    </header>
  )
}