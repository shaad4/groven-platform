import ClientSidebar from './ClientSidebar'

// TenantBrandingProvider is mounted once in App.jsx — no need to wrap here.
// Colors are applied globally via document.documentElement.style.setProperty.

export default function ClientLayout({ children, fullBleed = false, badges = {} }) {
  return (
    <div className="flex min-h-screen bg-layout-page text-text-main font-sans">
      <ClientSidebar badges={badges} />

      <div className="flex flex-1 flex-col min-w-0 transition-all duration-300 ease-in-out">
        {fullBleed ? (
          <main className="flex-1 h-[100dvh] overflow-hidden">
            {children}
          </main>
        ) : (
          <main className="flex-1 overflow-y-auto px-4 pt-6 pb-[88px] lg:px-8 lg:pt-8 lg:pb-8">
            <div className="mx-auto h-full w-full max-w-5xl">
              {children}
            </div>
          </main>
        )}
      </div>
    </div>
  )
}