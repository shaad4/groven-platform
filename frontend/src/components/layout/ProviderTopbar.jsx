import { Plus } from 'lucide-react'
import NotificationBell from '../notifications/NotificationBell'

export default function ProviderTopbar({ title, onAddClient, showAddBtn = true, actions, rightSlot }) {
  const hasAddButton = showAddBtn && onAddClient
  return (
    <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-border bg-layout-card px-4 py-4 sm:px-6 lg:px-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-text-main sm:text-[23px]">{title}</h1>
      </div>
      <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {actions}
        {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
        <NotificationBell />
      </div>
      {hasAddButton && (
        <button type="button" onClick={onAddClient} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark sm:px-4">
          <Plus size={16} aria-hidden="true" />Add client
        </button>
      )}
    </header>
  )
}
