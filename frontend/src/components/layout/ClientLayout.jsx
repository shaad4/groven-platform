import { useAuth } from '../../context/AuthContext'
import ClientSidebar from './ClientSidebar'
import PortalBrand from '../client/PortalBrand'

export default function ClientLayout({ children, fullBleed = false, badges = {} }) {
  const { tenant } = useAuth()
  return (
    <div className="flex min-h-dvh bg-layout-page font-sans text-text-main">
      <ClientSidebar badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-[72px] shrink-0 items-center border-b border-border bg-layout-card px-4 lg:hidden"><PortalBrand tenant={tenant} /></header>
        {fullBleed ? <main className="h-[calc(100dvh-152px-env(safe-area-inset-bottom))] overflow-hidden lg:h-dvh">{children}</main> : <main className="flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:py-9 xl:px-10"><div className="mx-auto w-full max-w-6xl">{children}</div></main>}
      </div>
    </div>
  )
}
