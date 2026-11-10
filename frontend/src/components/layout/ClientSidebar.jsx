import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, FolderOpen, Settings, LogOut, ChevronDown, PanelLeftClose, UserRound } from 'lucide-react'
import ClientNotificationBell from '../notifications/ClientNotificationBell'
import { useAuth } from '../../context/AuthContext'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import ClientPortalSwitcher from './ClientPortalSwitcher'
import ClientSettingsModal from '../modals/ClientSettingsModal'
import PortalBrand from '../client/PortalBrand'
import ThemeToggle from '../ui/ThemeToggle'

const NAV_ITEMS = [{ to: '/portal', icon: LayoutDashboard, label: 'Overview' }, { to: '/my-requests', icon: FolderOpen, label: 'Requests', badgeKey: 'requests' }]

function UserPopup({ user, isMobile = false, onSettings, onLogout, onAppearanceChange }) {
  return <div className="w-72 rounded-2xl border border-border bg-layout-card p-2 shadow-xl">
    <div className="border-b border-border px-3 py-3"><p className="truncate text-sm font-semibold">{user?.display_name || 'Client'}</p><p className="mt-1 truncate text-xs text-text-sub">{user?.email}</p></div>
    <div className="border-b border-border py-2"><ClientPortalSwitcher isMobile={isMobile} /></div>
    <button onClick={onSettings} className="mt-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-text-sub hover:bg-surface"><Settings size={16} />Account settings</button>
    <div className="border-y border-border px-1 py-3"><p className="mb-2 px-2 text-xs font-medium text-text-sub">Appearance</p><div onClick={onAppearanceChange}><ThemeToggle className="w-full justify-between" /></div></div>
    <button onClick={onLogout} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={16} />Sign out</button>
  </div>
}

export default function ClientSidebar({ badges = {} }) {
  const { user, tenant, logout } = useAuth()
  const { tenantInfo } = useTenantBranding()
  const [isCollapsed, setIsCollapsed] = useState(() => { try { return localStorage.getItem('client-sidebar-collapsed') === 'true' } catch { return false } })
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const popupRef = useRef(null)
  const mobileRef = useRef(null)
  const desktopAccountRef = useRef(null)
  const mobileAccountRef = useRef(null)
  const initials = (user?.display_name || 'Client').split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => {
    const dismiss = event => { if (!popupRef.current?.contains(event.target) && !mobileRef.current?.contains(event.target)) setIsPopupOpen(false) }
    const escape = event => { if (event.key === 'Escape') setIsPopupOpen(false) }
    document.addEventListener('mousedown', dismiss); document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', dismiss); document.removeEventListener('keydown', escape) }
  }, [])
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
      <div className="relative border-t border-border p-3" ref={popupRef}>
        <button ref={desktopAccountRef} onClick={() => setIsPopupOpen(value => !value)} aria-label="Open account menu" aria-expanded={isPopupOpen} className={`flex min-h-12 w-full items-center gap-3 rounded-xl p-2 hover:bg-surface ${isCollapsed ? 'justify-center' : ''}`}>
          {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" /> : <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-sub">{initials}</span>}
          {!isCollapsed && <><span className="min-w-0 flex-1 text-left"><span className="block truncate text-sm font-semibold">{user?.display_name || 'Client'}</span><span className="mt-0.5 block text-xs text-text-dim">Your account</span></span><ChevronDown size={15} className="text-text-dim" /></>}
        </button>
        {isPopupOpen && <div className={`absolute bottom-[80px] z-[60] ${isCollapsed ? 'left-4' : 'left-3'}`}><UserPopup user={user} onAppearanceChange={() => { setIsPopupOpen(false); desktopAccountRef.current?.focus() }} onSettings={() => { setIsPopupOpen(false); setShowSettings(true) }} onLogout={() => { setIsPopupOpen(false); logout() }} /></div>}
      </div>
    </aside>
    <nav aria-label="Mobile client workspace" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-layout-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="flex h-20 items-center justify-around px-2" ref={mobileRef}>
        {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => <NavLink key={to} to={to} end={to === '/portal'} className={({ isActive }) => `flex min-h-14 min-w-16 flex-col items-center justify-center gap-1.5 rounded-xl px-2 ${isActive ? 'text-primary-ink' : 'text-text-sub'}`}><span className="relative"><Icon size={21} />{badges[badgeKey] > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-primary px-1 text-xs text-white">{badges[badgeKey]}</span>}</span><span className="text-xs font-medium">{label}</span></NavLink>)}
        <ClientNotificationBell isMobileNav />
        <div className="relative"><button ref={mobileAccountRef} onClick={() => setIsPopupOpen(value => !value)} aria-expanded={isPopupOpen} className={`flex min-h-14 min-w-16 flex-col items-center justify-center gap-1.5 rounded-xl px-2 ${isPopupOpen ? 'text-primary-ink' : 'text-text-sub'}`}><UserRound size={21} /><span className="text-xs font-medium">Account</span></button>{isPopupOpen && <div className="absolute bottom-[72px] right-0"><UserPopup user={user} isMobile onAppearanceChange={() => { setIsPopupOpen(false); mobileAccountRef.current?.focus() }} onSettings={() => { setIsPopupOpen(false); setShowSettings(true) }} onLogout={() => { setIsPopupOpen(false); logout() }} /></div>}</div>
      </div>
    </nav>
    {showSettings && <ClientSettingsModal open onClose={() => setShowSettings(false)} />}
  </>
}
