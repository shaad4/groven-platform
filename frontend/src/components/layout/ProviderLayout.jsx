import ProviderSidebar from './ProviderSidebar'
import { useBadges } from '../../hooks/useBadges'

export default function ProviderLayout({ children, topbar, fullBleed = false }) {
  const { badges } = useBadges()

  return (
    <div className="flex h-dvh overflow-hidden bg-layout-page text-text-main">
      <a href="#workspace-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[300] focus:rounded-xl focus:bg-layout-card focus:px-4 focus:py-3 focus:text-primary">Skip to content</a>
      <ProviderSidebar badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {topbar && <div className="relative z-40 shrink-0">{topbar}</div>}
        <main
          id="workspace-content"
          tabIndex={-1}
          className={fullBleed
            ? 'min-h-0 flex-1 overflow-hidden pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0'
            : 'min-h-0 flex-1 overflow-y-auto pb-[calc(92px+env(safe-area-inset-bottom))] lg:pb-0'}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
