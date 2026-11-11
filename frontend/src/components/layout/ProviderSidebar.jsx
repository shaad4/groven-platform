import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, FolderKanban, Activity, Settings, LogOut, ChevronDown, PanelLeftClose, ArrowUpRight, Building2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useSelector } from 'react-redux'
import { selectTenant } from '../../features/auth/authSlice'
import { appUrl } from '../../utils/urls'
import PortalSwitcher from './PortalSwitcher'
import { getWorkspace } from '../../api/settings.api'
import ProviderSettingsModal from '../modals/ProviderSettingsModal'
import ThemeToggle from '../ui/ThemeToggle'
import { MobileNavigationDrawer, useMobileNavigation } from './MobileNavigation'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/requests', icon: FolderKanban, label: 'Requests', badgeKey: 'requests' },
  { to: '/clients', icon: Users, label: 'Clients', badgeKey: 'clients' },
  { to: '/activity', icon: Activity, label: 'Activity' },
]

export default function ProviderSidebar({ badges = {} }) {
  const { user, logout } = useAuth()
  const { closeNavigation } = useMobileNavigation()
  const tenant = useSelector(selectTenant)
  const [planName, setPlanName] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('provider-sidebar-collapsed') === 'true')
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const popupRef = useRef(null)
  const initials = (user?.display_name || 'You').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => { getWorkspace().then(r => setPlanName(r.data.data?.plan?.name)).catch(() => {}) }, [])
  useEffect(() => { localStorage.setItem('provider-sidebar-collapsed', isCollapsed) }, [isCollapsed])
  useEffect(() => {
    const closeOutside = event => {
      if (!popupRef.current?.contains(event.target)) setIsPopupOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key !== 'Escape' || !isPopupOpen) return
      setIsPopupOpen(false)
      popupRef.current?.querySelector('button')?.focus()
    }
    document.addEventListener('mousedown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => { document.removeEventListener('mousedown', closeOutside); document.removeEventListener('keydown', closeOnEscape) }
  }, [isPopupOpen])

  const renderAvatar = (small = false) => (
    <span className={`${small ? 'h-5 w-5 text-[9px]' : 'h-9 w-9 text-xs'} flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary font-semibold text-on-primary`}>
      {user?.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : initials}
    </span>
  )

  const renderAccountMenu = () => (
    <div className="max-h-[calc(100dvh-120px)] overflow-y-auto rounded-2xl border border-border bg-layout-card p-1.5 text-text-main shadow-xl">
      <div className="border-b border-border px-3 py-3">
        <p className="truncate text-sm font-semibold">{user?.display_name || 'Your account'}</p>
        <p className="mt-1 truncate text-xs text-text-dim">{user?.email || tenant?.name}</p>
      </div>
      <button type="button" onClick={() => { setIsPopupOpen(false); setShowSettings(true) }} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-text-sub hover:bg-surface"><Settings size={16} /><span>Workspace settings</span></button>
      <div className="border-y border-border px-2 py-3"><p className="mb-2 px-1 text-xs font-medium text-text-sub">Appearance</p><ThemeToggle className="w-full" /></div>
      <button type="button" onClick={() => { setIsPopupOpen(false); logout() }} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={16} /><span>Sign out</span></button>
    </div>
  )

  return (
    <>
      <aside aria-label="Workspace navigation" className={`relative z-[60] hidden h-dvh shrink-0 flex-col border-r border-on-primary/10 bg-sidebar transition-[width] duration-200 motion-reduce:transition-none lg:flex ${isCollapsed ? 'w-[80px]' : 'w-[240px] xl:w-[256px]'}`}>
        <div className={`flex min-h-[92px] items-center gap-1 ${isCollapsed ? 'justify-center px-3' : 'px-4'}`}>
          {!isCollapsed && <div className="min-w-0 flex-1"><PortalSwitcher /></div>}
          <button type="button" onClick={() => setIsCollapsed(!isCollapsed)} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-primary/60 transition-colors hover:bg-on-primary/5 hover:text-on-primary"><PanelLeftClose size={17} className={isCollapsed ? 'rotate-180' : ''} /></button>
        </div>
        {!isCollapsed && <p className="px-7 pb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-on-primary/60">Workspace</p>}
        <nav aria-label="Primary" className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => (
            <NavLink key={to} to={to} aria-label={isCollapsed ? label : undefined} title={isCollapsed ? label : undefined} className={({ isActive }) => `group flex min-h-11 items-center rounded-xl text-sm transition-colors ${isCollapsed ? 'justify-center' : 'gap-3 px-3'} ${isActive ? 'bg-on-primary/10 font-semibold text-on-primary' : 'text-on-primary/75 hover:bg-on-primary/5 hover:text-on-primary'}`}>
              <Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              {!isCollapsed && <><span className="flex-1">{label}</span>{badgeKey && Number(badges[badgeKey]) > 0 && <span className="min-w-5 rounded-md bg-primary text-on-primary px-1.5 py-0.5 text-center text-[11px] font-medium">{badges[badgeKey]}</span>}</>}
            </NavLink>
          ))}
        </nav>
        {planName && planName !== 'pro' && <div className="mx-3 mb-4"><NavLink to="/upgrade" title={isCollapsed ? 'Upgrade to Pro' : undefined} className={`flex items-center rounded-xl border border-on-primary/10 bg-on-primary/5 text-on-primary transition-colors hover:bg-on-primary/10 ${isCollapsed ? 'justify-center p-3' : 'gap-3 p-3.5'}`}><ArrowUpRight size={18} aria-hidden="true" />{!isCollapsed && <span className="text-sm font-semibold">Upgrade to Pro</span>}</NavLink></div>}
        <div className="relative border-t border-on-primary/10 p-3" ref={popupRef}>
          <button type="button" aria-expanded={isPopupOpen} aria-label="Open account options" onClick={() => setIsPopupOpen(v => !v)} className={`flex min-h-12 w-full items-center rounded-xl p-2 transition-colors hover:bg-on-primary/5 ${isCollapsed ? 'justify-center' : 'gap-3 text-left'}`}>
            {renderAvatar()}
            {!isCollapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-on-primary">{user?.display_name || 'Your account'}</span><span className="mt-0.5 block text-xs capitalize text-on-primary/60">{planName ? `${planName} plan` : 'Workspace account'}</span></span><ChevronDown size={14} className={`text-on-primary/60 ${isPopupOpen ? 'rotate-180' : ''}`} /></>}
          </button>
          {isPopupOpen && <div className="absolute bottom-full left-3 z-50 mb-2 w-[304px] max-w-[calc(100vw-24px)]">{renderAccountMenu()}</div>}
        </div>
      </aside>
      <MobileNavigationDrawer title="Workspace navigation">
        <div className="flex items-center gap-3 border-b border-border px-5 py-5">
          {tenant?.logo_url ? <img src={tenant.logo_url} alt="" className="h-10 w-10 shrink-0 rounded-xl object-contain" /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-ink"><Building2 size={20} /></span>}
          <div className="min-w-0"><p className="truncate text-sm font-semibold">{tenant?.name || 'Your workspace'}</p><p className="mt-1 text-xs text-text-sub">Client workspace</p></div>
        </div>
        <nav aria-label="Mobile workspace" className="space-y-1 p-3">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm ${isActive ? 'bg-primary-light font-semibold text-primary-ink' : 'text-text-sub hover:bg-surface'}`}><Icon size={19} aria-hidden="true" /><span className="flex-1">{label}</span>{Number(badges[badgeKey]) > 0 && <span className="rounded-md bg-surface px-2 py-0.5 text-xs tabular-nums">{badges[badgeKey]}</span>}</NavLink>)}
          {planName && planName !== 'pro' && <NavLink to="/upgrade" className="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-primary-ink hover:bg-surface"><ArrowUpRight size={19} />Upgrade to Pro</NavLink>}
        </nav>
        <div className="mx-3 border-t border-border py-3">
          <button type="button" onClick={() => { closeNavigation(); setShowSettings(true) }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm text-text-sub hover:bg-surface"><Settings size={19} />Workspace settings</button>
          <button type="button" onClick={() => { closeNavigation(); window.location.replace(appUrl(null, '/portals')) }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm text-text-sub hover:bg-surface"><Building2 size={19} />Switch workspace</button>
          <div className="px-3 py-3"><p className="mb-3 text-xs font-medium text-text-sub">Appearance</p><ThemeToggle className="w-full justify-between" /></div>
        </div>
        <div className="mx-3 border-t border-border py-3">
          <div className="flex items-center gap-3 px-3 py-2">{renderAvatar()}<div className="min-w-0"><p className="truncate text-sm font-semibold">{user?.display_name || 'Your account'}</p><p className="mt-1 truncate text-xs text-text-sub">{user?.email}</p></div></div>
          <button type="button" onClick={() => { closeNavigation(); logout() }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={19} />Sign out</button>
        </div>
      </MobileNavigationDrawer>
      {showSettings && <ProviderSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />}
    </>
  )
}
