import AdminSidebar from './AdminSidebar'
import { GrovenLogo } from '../marketing/BrandMark'
import { MobileNavigationButton, MobileNavigationProvider } from './MobileNavigation'

export default function AdminLayout({ children }) {
  return (
    <MobileNavigationProvider>
      <div className="flex h-dvh overflow-hidden bg-layout-page">
        <a href="#admin-content" className="skip-link">Skip to content</a>
        <AdminSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-layout-card px-3 lg:hidden">
            <MobileNavigationButton />
            <GrovenLogo className="h-6" />
            <span className="ml-auto truncate text-xs text-text-sub">Administration</span>
          </header>
          <main id="admin-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)] lg:pb-0">
            {children}
          </main>
        </div>
      </div>
    </MobileNavigationProvider>
  )
}
