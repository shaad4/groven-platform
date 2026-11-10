import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import ClientNotificationBell from '../notifications/ClientNotificationBell'
import {
  LayoutDashboard,
  FolderOpen,
  Settings,
  LogOut,
  ChevronDown,
  PanelLeftClose,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import ClientPortalSwitcher from './ClientPortalSwitcher'
import ClientSettingsModal from '../modals/ClientSettingsModal'

// ─── Client nav items ─────────────────────────────────────────
const NAV_ITEMS = [
  {
    to: '/portal',
    icon: LayoutDashboard,
    label: 'Home',
  },
  {
    to: '/my-requests',
    icon: FolderOpen,
    label: 'Requests',
    badgeKey: 'requests',
  },
]

export default function ClientSidebar({ badges = {} }) {
  const { user, tenant, logout } = useAuth()
  const { colors } = useTenantBranding()
  const { accent, accentDark, accentSoft, bg1 } = colors

  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('provider-sidebar-collapsed')
    return saved === 'true'
  })

  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const popupRef = useRef(null)
  const mobileRef = useRef(null)

  const initials = user?.display_name
    ? user.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??'

  // Provider branding
  const providerName = tenant?.name || 'Portal'
  const providerInitials = providerName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const providerLogoUrl = tenant?.logo_url || null

  useEffect(() => {
    function handleClickOutside(e) {
      const inDesktop = popupRef.current && popupRef.current.contains(e.target)
      const inMobile = mobileRef.current && mobileRef.current.contains(e.target)

      if (!inDesktop && !inMobile) {
        setIsPopupOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    localStorage.setItem('provider-sidebar-collapsed', isCollapsed)
  }, [isCollapsed])

  // ───────────────── User Popup ─────────────────
  const UserPopup = ({ isMobile = false, className = '' }) => (
    <div
      className={`
        z-50 w-[240px] rounded-xl border border-border/50
        bg-white shadow-soft
        ${className}
      `}
    >
      {/* User */}
      <div className="px-4 py-3 bg-surface/50 border-b border-border/50 rounded-t-xl">
        <p className="truncate text-sm font-semibold text-text-main">
          {user?.display_name}
        </p>
        <p className="truncate text-xs text-text-sub mt-0.5">
          {user?.email}
        </p>
      </div>

      {/* Portal switcher */}
      <div className="p-2 border-b border-border/50">
        <ClientPortalSwitcher isMobile={isMobile} />
      </div>

      {/* Actions */}
      <div className="p-1">
        <button
          onClick={() => {
            setIsPopupOpen(false)
            setShowSettings(true)
          }}
          className="
            flex items-center gap-2.5

            w-full text-left

            px-3 py-2

            rounded-lg

            text-sm text-text-sub

            hover:bg-surface
            hover:text-text-main

            transition-colors
          "
        >
          <Settings size={15} />

          <span>Settings</span>
        </button>

        <div className="mx-2 my-1 h-px bg-border/50" />

        <button
          onClick={() => {
            setIsPopupOpen(false)
            logout()
          }}
          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={15} />
          <span className="font-medium">Sign out</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* ═══════════════ DESKTOP SIDEBAR ═══════════════════════ */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 shrink-0 select-none transition-all duration-300 ease-in-out border-r ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
        style={{ background: bg1, borderColor: `${accent}22` }}
      >
        {/* ───────────────── Header ───────────────── */}
        <div
          className={`
            flex items-center pt-6 pb-4 border-b border-white/10
            ${isCollapsed ? 'justify-center px-0' : 'justify-between px-4'}
          `}
        >
          {/* Provider branding */}
          {!isCollapsed && (
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {providerLogoUrl ? (
                <img
                  src={providerLogoUrl}
                  alt={providerName}
                  className="h-9 w-9 rounded-lg object-cover shadow-sm shrink-0"
                />
              ) : (
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {providerInitials}
                </div>
              )}

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white leading-tight">
                  {providerName}
                </p>
                <p className="text-xs text-white/60 mt-0.5">Client Portal</p>
              </div>
            </div>
          )}

          {/* Collapse button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <PanelLeftClose
              size={16}
              className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* ───────────────── Navigation ───────────────── */}
        <nav className="px-3 pt-6 flex-1 flex flex-col gap-1.5">
          <div className="mb-4 px-1">
            <ClientNotificationBell collapsed={isCollapsed} />
          </div>

          {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/portal'}
              title={isCollapsed ? label : undefined}
              className={({ isActive }) =>
                `relative flex items-center rounded-lg text-sm transition-all duration-200 ${isCollapsed ? 'justify-center py-3 px-0 mx-auto w-10' : 'gap-3 px-3 py-2.5'}`
              }
              style={({ isActive }) =>
                isActive
                  ? { background: accent, color: '#fff', fontWeight: 500 }
                  : { color: 'rgba(255,255,255,0.7)' }
              }
            >
              <Icon size={18} className="shrink-0" />

              {!isCollapsed && <span className="flex-1">{label}</span>}

              {!isCollapsed && badgeKey && badges[badgeKey] > 0 && (
                <span className="text-[10px] font-bold bg-white text-sidebar px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {badges[badgeKey]}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ───────────────── Footer ───────────────── */}
        <div className="p-3 relative border-t border-white/10" ref={popupRef}>
          {/* User row */}
          {!isCollapsed && (
            <div
              onClick={() => setIsPopupOpen(!isPopupOpen)}
              className={`
                flex items-center justify-between gap-3 rounded-xl cursor-pointer transition-colors p-2.5
                ${isPopupOpen ? 'bg-white/10' : 'hover:bg-white/5'}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="
                    h-8 w-8
                    shrink-0
                    rounded-full
                    overflow-hidden
                    bg-white
                  "
                >
                  {user?.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="
                        w-full h-full
                        flex items-center justify-center
                        text-xs
                        font-bold
                        text-sidebar
                      "
                    >
                      {initials}
                    </div>
                  )}

                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm text-white font-medium leading-tight">
                    {user?.display_name || 'Client'}
                  </p>
                  <p className="text-xs text-white/60 mt-0.5 truncate">
                    {user?.email || ''}
                  </p>
                </div>
              </div>

              <ChevronDown
                size={14}
                className={`text-white/50 shrink-0 transition-transform duration-200 ${isPopupOpen ? 'rotate-180' : ''}`}
              />
            </div>
          )}

          {/* Desktop popup */}
          {isPopupOpen && !isCollapsed && (
            <UserPopup className="absolute left-3 bottom-[76px]" />
          )}
        </div>
      </aside>

      {/* ═══════════════ MOBILE BOTTOM NAV ═════════════════════ */}
      <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white/80 backdrop-blur-md border-t border-border pb-[env(safe-area-inset-bottom)] supports-[backdrop-filter]:bg-white/60">
        <div className="flex items-center justify-around px-2 py-2" ref={mobileRef}>
          
          {/* Standard Nav Items */}
          {NAV_ITEMS.map(({ to, icon: Icon, label, badgeKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/portal'}
              className="relative flex flex-col items-center justify-center gap-1 min-w-[72px] rounded-xl px-2 py-2 transition-all duration-200"
              style={({ isActive }) =>
                isActive ? { color: accent } : { color: '#9EA89E' }
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />

                    {badgeKey && badges[badgeKey] > 0 && (
                      <span
                        className="absolute -top-1.5 -right-2 h-4 min-w-[16px] px-1 flex items-center justify-center rounded-full shadow-sm text-white text-[9px] font-bold"
                        style={{ background: accent }}
                      >
                        {badges[badgeKey] > 9 ? '9+' : badges[badgeKey]}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Notification Nav Item (Handled internally by component) */}
          <ClientNotificationBell isMobileNav={true} />

          {/* Profile Nav Item */}
          <div
            className="relative flex flex-col items-center justify-center gap-1 min-w-[72px] rounded-xl px-2 py-2 transition-all duration-200 cursor-pointer"
            style={{ color: isPopupOpen ? accent : '#9EA89E' }}
            onClick={(e) => {
              e.stopPropagation()
              setIsPopupOpen(!isPopupOpen)
            }}
          >
            <div
              className={`h-[22px] w-[22px] rounded-full overflow-hidden shadow-sm transition-transform duration-200 ${isPopupOpen ? 'scale-110' : ''}`}
              style={{ background: accent, boxShadow: isPopupOpen ? `0 0 0 2px ${accentSoft}` : undefined }}
            >
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div
                  className="
                    w-full h-full
                    flex items-center justify-center
                    text-[9px]
                    font-bold
                    text-white
                  "
                >
                  {initials}
                </div>
              )}

            </div>
            <span className="text-[10px] font-medium tracking-wide">Profile</span>

            {/* Mobile popup */}
            {isPopupOpen && (
              <div className="absolute bottom-[60px] right-2" onClick={e => e.stopPropagation()}>
                <UserPopup isMobile={true} className="shadow-2xl border-border/50 animate-in slide-in-from-bottom-4 duration-200" />
              </div>
            )}
          </div>

        </div>
      </div>
      {showSettings && (
        <ClientSettingsModal
          open={showSettings}
          onClose={() =>
            setShowSettings(false)
          }
        />
      )}
    </>
  )
}