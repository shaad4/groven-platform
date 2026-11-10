import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F6F4]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto pt-[60px] pb-[64px] lg:pt-0 lg:pb-0">
        {children}
      </main>
    </div>
  )
}