import { createContext, useCallback, useContext, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useDialogFocus } from '../../hooks/useDialogFocus'

const NavigationContext = createContext(null)

export function MobileNavigationProvider({ children }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const panelId = useId()
  const closeNavigation = useCallback(() => setOpen(false), [])
  const openNavigation = useCallback(() => setOpen(true), [])

  useEffect(() => { closeNavigation() }, [pathname, closeNavigation])
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1024px)')
    const closeOnDesktop = () => { if (desktop.matches) closeNavigation() }
    desktop.addEventListener('change', closeOnDesktop)
    return () => desktop.removeEventListener('change', closeOnDesktop)
  }, [closeNavigation])

  const value = useMemo(() => ({ open, panelId, openNavigation, closeNavigation }), [open, panelId, openNavigation, closeNavigation])
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>
}

export function useMobileNavigation() {
  return useContext(NavigationContext)
}

export function MobileNavigationButton({ className = '' }) {
  const { open, panelId, openNavigation } = useMobileNavigation()
  return <button type="button" aria-label="Open navigation" aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? panelId : undefined} onClick={openNavigation} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-sub transition-colors hover:bg-surface lg:hidden ${className}`}><Menu size={21} aria-hidden="true" /></button>
}

export function MobileNavigationDrawer({ children, title = 'Navigation' }) {
  const { open, panelId, closeNavigation } = useMobileNavigation()
  const dialogRef = useDialogFocus(open, closeNavigation)
  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] lg:hidden">
      <div aria-hidden="true" onClick={closeNavigation} className="absolute inset-0 bg-black/40" />
      <aside ref={dialogRef} id={panelId} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className="relative flex h-dvh w-[min(360px,calc(100vw-32px))] flex-col border-r border-border bg-layout-card text-text-main shadow-xl">
        <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)]">
          <h2 className="truncate text-sm font-semibold">{title}</h2>
          <button type="button" aria-label="Close navigation" onClick={closeNavigation} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-sub hover:bg-surface"><X size={20} aria-hidden="true" /></button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]" onClick={event => { if (event.target.closest('a[href]')) closeNavigation() }}>{children}</div>
      </aside>
    </div>, document.body,
  )
}
