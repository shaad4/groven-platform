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

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
  { to: '/requests', icon: FolderKanban, label: 'Requests', badgeKey: 'requests' },
  { to: '/clients', icon: Users, label: 'Clients', badgeKey: 'clients' },
  { to: '/activity', icon: Activity, label: 'Activity' },
]

export default function ProviderSidebar({ badges = {} }) {
  const { user, logout } = useAuth()
  const tenant = useSelector(selectTenant)
  const [planName, setPlanName] = useState(null)
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('provider-sidebar-collapsed') === 'true')
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const popupRef = useRef(null)
  const mobileRef = useRef(null)
  const mobilePopupRef = useRef(null)
  const initials = (user?.display_name || 'You').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => { getWorkspace().then(r => setPlanName(r.data.data?.plan?.name)).catch(() => {}) }, [])
  useEffect(() => { localStorage.setItem('provider-sidebar-collapsed', isCollapsed) }, [isCollapsed])
  useEffect(() => {
    const closeOutside = event => {
      if (![popupRef, mobileRef, mobilePopupRef].some(ref => ref.current?.contains(event.target))) setIsPopupOpen(false)
    }
    const closeOnEscape = event => {
      if (event.key !== 'Escape' || !isPopupOpen) return
      setIsPopupOpen(false)
      const container = window.matchMedia('(min-width: 1024px)').matches ? popupRef.current : mobileRef.current
      container?.querySelector('button')?.focus()
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

  const renderAccountMenu = (mobile = false) => (
    <div className="overflow-hidden rounded-2xl border border-border bg-layout-card p-1.5 text-text-main shadow-xl">
      <div className="border-b border-border px-3 py-3">
        <p className="truncate text-sm font-semibold">{user?.display_name || 'Your account'}</p>
        <p className="mt-1 truncate text-xs text-text-dim">{user?.email || tenant?.name}</p>
      </div>
      {mobile && <button type="button" onClick={() => { setIsPopupOpen(false); window.location.replace(appUrl(null, '/portals')) }} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-text-sub hover:bg-surface"><Building2 size={16} /><span>Switch workspace</span></button>}
      <button type="button" onClick={() => { setIsPopupOpen(false); setShowSettings(true) }} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-text-sub hover:bg-surface"><Settings size={16} /><span>Workspace settings</span></button>
      <div className="border-y border-border px-2 py-3"><p className="mb-2 px-1 text-xs font-medium text-text-sub">Appearance</p><ThemeToggle className="w-full" /></div>
      <button type="button" onClick={() => { setIsPopupOpen(false); logout() }} className="flex min-h-11 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm text-status-danger-text hover:bg-status-danger-bg"><LogOut size={16} /><span>Sign out</span></button>
    </div>
  )

  return (
    <>
      <aside aria-label="Workspace navigation" className={`relative hidden h-dvh shrink-0 flex-col border-r border-on-primary/10 bg-sidebar transition-[width] duration-200 motion-reduce:transition-none lg:flex ${isCollapsed ? 'w-[80px]' : 'w-[240px] xl:w-[256px]'}`}>
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
          {isPopupOpen && <div className="absolute bottom-full left-3 z-50 mb-2 w-[252px]">{renderAccountMenu()}</div>}
        </div>
      </aside>
      {isPopupOpen && <div ref={mobilePopupRef} className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-3 z-[90] w-[min(288px,calc(100vw-24px))] lg:hidden">{renderAccountMenu(true)}</div>}
      <nav ref={mobileRef} aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-layout-card px-2 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="grid h-[76px] grid-cols-5 items-center gap-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => <NavLink key={to} to={to} onClick={() => setIsPopupOpen(false)} className={({ isActive }) => `relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1.5 rounded-xl transition-colors ${isActive ? 'bg-primary-light text-primary-ink' : 'text-text-dim'}`}><Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span className="text-[10px] font-medium">{label}</span>{badgeKey && Number(badges[badgeKey]) > 0 && <span className="absolute right-3 top-1.5 h-1.5 w-1.5 rounded-full bg-primary" aria-label={`${badges[badgeKey]} updates`} />}</NavLink>)}
          <button type="button" aria-label="Account options" aria-expanded={isPopupOpen} onClick={() => setIsPopupOpen(v => !v)} className={`flex min-h-14 flex-col items-center justify-center gap-1.5 rounded-xl ${isPopupOpen ? 'bg-primary-light text-primary-ink' : 'text-text-dim'}`}>{renderAvatar(true)}<span className="text-[10px] font-medium">Account</span></button>
        </div>
      </nav>
      {showSettings && <ProviderSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />}
    </>
  )
}
