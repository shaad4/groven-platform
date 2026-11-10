import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-dvh overflow-hidden bg-layout-page">
      <a href="#admin-content" className="skip-link">Skip to content</a>
      <AdminSidebar />
      <main id="admin-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto pt-16 pb-[calc(88px+env(safe-area-inset-bottom))] lg:pt-0 lg:pb-0">
        {children}
      </main>
    </div>
  )
}