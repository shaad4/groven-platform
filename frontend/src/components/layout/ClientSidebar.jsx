import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Settings, LogOut, ChevronDown, PanelLeftClose } from 'lucide-react'
import ClientNotificationBell from '../notifications/ClientNotificationBell'
import { useAuth } from '../../context/AuthContext'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import ClientPortalSwitcher from './ClientPortalSwitcher'
import ClientSettingsModal from '../modals/ClientSettingsModal'
import PortalBrand from '../client/PortalBrand'
import ThemeToggle from '../ui/ThemeToggle'
import usePortalDialog from '../client/usePortalDialog'
import { MobileNavigationDrawer, useMobileNavigation } from './MobileNavigation'

const NAV_ITEMS = [{ to: '/portal', icon: LayoutDashboard, label: 'Overview' }, { to: '/my-requests', icon: FolderOpen, label: 'Requests', badgeKey: 'requests' }]

function AccountPopup({ anchor, user, onClose, onSettings, onLogout }) {
  const dialogRef = usePortalDialog(true, onClose)
  const [position, setPosition] = useState({ left: 12, top: 12, width: 320, maxHeight: 'calc(100dvh - 24px)' })

  useLayoutEffect(() => {
    const panel = dialogRef.current
    const updatePosition = () => {
      if (!anchor.getClientRects().length) { onClose(); return }
      const viewport = window.visualViewport
      const width = viewport?.width || window.innerWidth
      const height = viewport?.height || window.innerHeight
      const offsetX = viewport?.offsetLeft || 0
      const offsetY = viewport?.offsetTop || 0
      const rect = anchor.getBoundingClientRect()
      const panelWidth = Math.min(320, width - 24)
      const panelHeight = Math.min(panel.scrollHeight, height - 24)
      const preferredLeft = window.innerWidth < 1024 ? rect.right - panelWidth : rect.left
      const above = rect.top - panelHeight - 8
      const preferredTop = above >= offsetY + 12 ? above : rect.bottom + 8
      const nextPosition = {
        left: Math.max(offsetX + 12, Math.min(preferredLeft, offsetX + width - panelWidth - 12)),
        top: Math.max(offsetY + 12, Math.min(preferredTop, offsetY + height - panelHeight - 12)),
        width: panelWidth,
        maxHeight: height - 24,
      }
      setPosition(current => Object.keys(nextPosition).every(key => current[key] === nextPosition[key]) ? current : nextPosition)
    }
    updatePosition()
    const observer = new ResizeObserver(updatePosition)
    observer.observe(panel)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    window.visualViewport?.addEventListener('resize', updatePosition)
    window.visualViewport?.addEventListener('scroll', updatePosition)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      window.visualViewport?.removeEventListener('resize', updatePosition)
      window.visualViewport?.removeEventListener('scroll', updatePosition)
    }
  }, [anchor, dialogRef, onClose])

  useEffect(() => {
    const dismiss = event => { if (!dialogRef.current?.contains(event.target) && !anchor.contains(event.target)) onClose() }
    document.addEventListener('pointerdown', dismiss)
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [anchor, dialogRef, onClose])

  return createPortal(<div id="client-account-menu" ref={dialogRef} role="dialog" aria-label="Account menu" tabIndex={-1} style={position} className="fixed z-[90] overflow-y-auto overscroll-contain rounded-2xl border border-border bg-layout-card p-2 text-text-main shadow-xl">
    <div className="border-b border-border px-3 py-3"><p className="truncate text-sm font-semibold">{user?.display_name || 'Client'}</p><p className="mt-1 truncate text-xs text-text-sub">{user?.email}</p></div>
    <div className="border-b border-border py-2"><ClientPortalSwitcher /></div>
    <button onClick={onSettings} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-text-sub hover:bg-surface"><Settings size={16} />Account settings</button>
    <div className="border-y border-border px-1 py-3"><p className="mb-2 px-2 text-xs font-medium text-text-sub">Appearance</p><div onClick={onClose}><ThemeToggle className="w-full justify-between" /></div></div>
    <button onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={16} />Sign out</button>
  </div>, document.body)
}

export default function ClientSidebar({ badges = {} }) {
  const { user, tenant, logout } = useAuth()
  const { closeNavigation } = useMobileNavigation()
  const { tenantInfo } = useTenantBranding()
  const [isCollapsed, setIsCollapsed] = useState(() => { try { return localStorage.getItem('client-sidebar-collapsed') === 'true' } catch { return false } })
  const [menuAnchor, setMenuAnchor] = useState(null)
  const isPopupOpen = Boolean(menuAnchor)
  const [showSettings, setShowSettings] = useState(false)
  const desktopAccountRef = useRef(null)
  const initials = (user?.display_name || 'Client').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()

  const toggleAccount = event => {
    const trigger = event.currentTarget
    setMenuAnchor(current => current === trigger ? null : trigger)
  }
  const closeAccount = useCallback(() => setMenuAnchor(null), [])

  useEffect(() => { try { localStorage.setItem('client-sidebar-collapsed', String(isCollapsed)) } catch { /* optional preference */ } }, [isCollapsed])



  return <>
    <aside className={`sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-layout-card transition-[width] duration-200 lg:flex ${isCollapsed ? 'w-[88px]' : 'w-[248px]'}`}>
      <div className={`flex h-24 items-center ${isCollapsed ? 'justify-center px-3' : 'px-5'}`}><PortalBrand tenant={tenant} compact={isCollapsed} /></div>
      <div className="px-3"><button onClick={() => setIsCollapsed(value => !value)} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-text-dim hover:bg-surface ${isCollapsed ? 'mx-auto' : 'w-full'}`}><PanelLeftClose size={17} className={isCollapsed ? 'rotate-180' : ''} />{!isCollapsed && <span className="text-xs">Collapse navigation</span>}</button></div>
      <nav aria-label="Client workspace" className="flex-1 space-y-1 px-3 pt-6">
        {!isCollapsed && <p className="mb-3 px-3 text-xs font-medium text-text-dim">Workspace</p>}
        {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => <NavLink key={to} to={to} end={to === '/portal'} title={isCollapsed ? label : undefined} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-primary-light text-primary-ink' : 'text-text-sub hover:bg-surface hover:text-text-main'}`}><Icon size={19} />{!isCollapsed && <><span className="flex-1">{label}</span>{badges[badgeKey] > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs text-white">{badges[badgeKey]}</span>}</>}</NavLink>)}
        <div className="pt-2"><ClientNotificationBell collapsed={isCollapsed} /></div>
      </nav>
      {!isCollapsed && tenantInfo?.tagline && <p className="px-6 pb-6 text-xs leading-5 text-text-dim">{tenantInfo.tagline}</p>}
      <div className="relative border-t border-border p-3">
        <button ref={desktopAccountRef} onClick={toggleAccount} aria-label="Open account menu" aria-expanded={isPopupOpen} aria-haspopup="dialog" aria-controls={isPopupOpen ? 'client-account-menu' : undefined} className={`flex min-h-12 w-full items-center gap-3 rounded-xl p-2 hover:bg-surface ${isCollapsed ? 'justify-center' : ''}`}>
          {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-sub">{initials}</span>}
          {!isCollapsed && <><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{user?.display_name || 'Client'}</span><span className="mt-0.5 block text-xs text-text-dim">Your account</span></span><ChevronDown size={15} className="text-text-dim" /></>}
        </button>

      </div>
    </aside>
    <MobileNavigationDrawer title="Navigation">
      <div className="space-y-6 p-4">
        <PortalBrand tenant={tenant} />
        <nav aria-label="Mobile client workspace" className="space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => <NavLink key={to} to={to} end={to === '/portal'} onClick={closeNavigation} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${isActive ? 'bg-primary-light text-primary-ink' : 'text-text-sub hover:bg-surface'}`}><Icon size={19} /><span className="flex-1">{label}</span>{badges[badgeKey] > 0 && <span className="rounded-md bg-primary px-1.5 py-0.5 text-xs text-on-primary">{badges[badgeKey]}</span>}</NavLink>)}
        </nav>
        <div className="border-t border-border pt-4"><ClientPortalSwitcher /></div>
        <div className="border-t border-border pt-4"><p className="truncate text-sm font-semibold">{user?.display_name || 'Client'}</p><p className="mt-1 truncate text-xs text-text-sub">{user?.email}</p><button onClick={() => { closeNavigation(); setShowSettings(true) }} className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-text-sub hover:bg-surface"><Settings size={17} />Account settings</button></div>
        <div className="border-t border-border pt-4"><p className="mb-3 text-xs font-medium text-text-sub">Appearance</p><div onClick={closeNavigation}><ThemeToggle className="w-full justify-between" /></div></div>
        <button onClick={() => { closeNavigation(); logout() }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={17} />Sign out</button>
      </div>
    </MobileNavigationDrawer>
    {menuAnchor && <AccountPopup anchor={menuAnchor} user={user} onClose={closeAccount} onSettings={() => { closeAccount(); setShowSettings(true) }} onLogout={() => { closeAccount(); logout() }} />}
    {showSettings && <ClientSettingsModal open onClose={() => setShowSettings(false)} />}
  </>
}
