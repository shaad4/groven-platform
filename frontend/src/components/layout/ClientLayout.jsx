import { useAuth } from '../../context/AuthContext'
import ClientSidebar from './ClientSidebar'
import PortalBrand from '../client/PortalBrand'
import ClientNotificationBell from '../notifications/ClientNotificationBell'
import { MobileNavigationProvider, MobileNavigationButton } from './MobileNavigation'

export default function ClientLayout({ children, fullBleed = false, badges = {} }) {
  const { tenant } = useAuth()
  return (
    <MobileNavigationProvider><div className="flex min-h-dvh bg-layout-page font-sans text-text-main">
      <ClientSidebar badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-layout-card px-3 lg:hidden"><MobileNavigationButton /><PortalBrand tenant={tenant} dense className="flex-1" /><ClientNotificationBell collapsed /></header>
        {fullBleed ? <main className="h-[calc(100dvh-56px)] overflow-hidden lg:h-dvh">{children}</main> : <main className="flex-1 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 lg:px-8 lg:py-9 xl:px-10"><div className="mx-auto w-full max-w-6xl">{children}</div></main>}
      </div>
    </div></MobileNavigationProvider>
  )
}
