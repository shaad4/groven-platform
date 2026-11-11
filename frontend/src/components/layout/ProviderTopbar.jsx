import { Plus } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'
import { MobileNavigationButton } from './MobileNavigation'

export default function ProviderTopbar({ title, onAddClient, showAddBtn = true, actions, rightSlot }) {
  const hasAddButton = showAddBtn && onAddClient
  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border bg-layout-card px-3 py-1.5 sm:min-h-[76px] sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-1.5">
        <MobileNavigationButton />
        <h1 className="text-lg font-semibold tracking-tight text-text-main sm:text-[23px]">{title}</h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {actions}
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        <NotificationBell />
      </div>
      {hasAddButton && (
        <button type="button" aria-label="Add client" onClick={onAddClient} className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark sm:px-4">
          <Plus size={18} aria-hidden="true" /><span className="hidden sm:inline">Add client</span>
        </button>
      )}
    </header>
  )
}
