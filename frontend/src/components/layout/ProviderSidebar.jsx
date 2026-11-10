import { useState, useRef, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  Activity,
  Settings,
  LogOut,
  ChevronDown,
  PanelLeftClose,
  Sparkles,
} from 'lucide-react'

import { useAuth } from '../../context/AuthContext'
import { useSelector } from 'react-redux'
import { selectTenant } from '../../features/auth/authSlice'
import { appUrl } from '../../utils/urls'
import PortalSwitcher from './PortalSwitcher'
import { getWorkspace } from '../../api/settings.api'

import ProviderSettingsModal from '../modals/ProviderSettingsModal'

const NAV_ITEMS = [
  {
    to: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
  },
  {
    to: '/clients',
    icon: Users,
    label: 'Clients',
    badgeKey: 'clients',
  },
  {
    to: '/requests',
    icon: FolderKanban,
    label: 'Requests',
    badgeKey: 'requests',
  },
  {
    to: '/activity',
    icon: Activity,
    label: 'Activity',
  },
]

export default function ProviderSidebar({
  badges = {},
}) {
  const { user, logout } = useAuth()
  const tenant = useSelector(selectTenant)

  const [planName, setPlanName] = useState(null)

  useEffect(() => {
    getWorkspace()
      .then(r => setPlanName(r.data.data?.plan?.name))
      .catch(() => {})
  }, [])

  const isPro = planName === 'pro'

  const [isCollapsed, setIsCollapsed] =
    useState(() => {
      const saved = localStorage.getItem(
        'provider-sidebar-collapsed'
      )

      return saved === 'true'
    })

  const [isPopupOpen, setIsPopupOpen] =
    useState(false)

  const [showSettings, setShowSettings] =
    useState(false)

  const popupRef = useRef(null)
  const mobileRef = useRef(null)
  const mobilePopupRef = useRef(null)

  const initials = user?.display_name
    ? user.display_name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??'

  useEffect(() => {
    function handleClickOutside(event) {
      const inDesktop = popupRef.current && popupRef.current.contains(event.target)
      const inMobile = mobileRef.current && mobileRef.current.contains(event.target)
      const inMobilePopup = mobilePopupRef.current && mobilePopupRef.current.contains(event.target)
      if (!inDesktop && !inMobile && !inMobilePopup) {
        setIsPopupOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      'provider-sidebar-collapsed',
      isCollapsed
    )
  }, [isCollapsed])

  return (
    <>
      {/* ───────────────── Desktop Sidebar ───────────────── */}
      <aside
        className={`
          hidden lg:flex flex-col

          h-screen

          sticky top-0

          shrink-0
          select-none

          transition-all duration-300 ease-out

          border-r border-white/[0.04]

          bg-gradient-to-b
          from-[#071A15]
          to-[#04110D]

          shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]

          ${
            isCollapsed
              ? 'w-[72px]'
              : 'w-[240px]'
          }
        `}
      >
       {/* ───────────────── Header ───────────────── */}
        <div
          className={`flex items-center pt-5 pb-6 ${
            isCollapsed
              ? 'px-0 justify-center'
              : 'px-4 justify-between'
          }`}
        >
          {!isCollapsed && (
            <div className="flex-1 min-w-0 mr-2">
              <PortalSwitcher />
            </div>
          )}

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={
              isCollapsed
                ? 'Expand sidebar'
                : 'Collapse sidebar'
            }
            className="
              p-1.5 rounded-lg

              text-white/30

              hover:text-white/80
              hover:bg-white/[0.05]

              transition-all duration-200
            "
          >
            <PanelLeftClose
              size={17}
              className={`
                transition-transform duration-300

                ${
                  isCollapsed
                    ? 'rotate-180 opacity-60'
                    : ''
                }
              `}
            />
          </button>
        </div>
        {/* ───────────────── Navigation ───────────────── */}
        <nav className="px-3 flex-1 space-y-1.5">
          {NAV_ITEMS.map(
            ({
              to,
              icon: Icon,
              label,
              badgeKey,
            }) => (
              <NavLink
                key={to}
                to={to}
                title={
                  isCollapsed
                    ? label
                    : undefined
                }
                className={({
                  isActive,
                }) =>
                  `
                  relative flex items-center rounded-xl text-[14px]

                  transition-all duration-200

                  ${
                    isCollapsed
                      ? 'justify-center py-2.5'
                      : 'gap-3 px-3 py-2.5'
                  }

                  ${
                    isActive
                      ? `
                        bg-white/[0.07]

                        text-white

                        font-medium

                        shadow-lg shadow-black/20

                        before:absolute
                        before:left-0
                        before:top-2
                        before:bottom-2
                        before:w-[3px]
                        before:rounded-full
                        before:bg-emerald-400
                      `
                      : `
                        text-white/45

                        hover:text-white/85
                        hover:bg-white/[0.03]
                        hover:translate-x-[1px]
                      `
                  }
                `
                }
              >
                <Icon
                  size={17}
                  className="shrink-0 opacity-80"
                />

                {!isCollapsed && (
                  <span className="flex-1 tracking-wide">
                    {label}
                  </span>
                )}

                {!isCollapsed &&
                  badgeKey &&
                  badges[
                    badgeKey
                  ] != null && (
                    <span
                      className="
                        text-[11px]

                        bg-white/[0.08]

                        text-white/55

                        px-1.5 py-0.5

                        rounded-md

                        font-normal
                      "
                    >
                      {
                        badges[
                          badgeKey
                        ]
                      }
                    </span>
                  )}
              </NavLink>
            )
          )}

          {planName && !isPro && (
            <NavLink
              to="/upgrade"
              title={isCollapsed ? 'Upgrade to Pro' : undefined}
              className={({ isActive }) =>
                `relative flex items-center rounded-xl text-[14px] transition-all duration-200
                ${isCollapsed ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5'}
                ${isActive
                  ? 'bg-emerald-400/15 text-emerald-300 font-medium'
                  : 'text-emerald-300/70 hover:bg-emerald-400/10 hover:text-emerald-300'
                }`
              }
            >
              <Sparkles size={17} className="shrink-0" />
              {!isCollapsed && (
                <span className="flex-1 tracking-wide">Upgrade to Pro</span>
              )}
            </NavLink>
          )}

        </nav>

        {/* ───────────────── Footer ───────────────── */}
        <div
          className="p-4 relative"
          ref={popupRef}
        >
          <div
            onClick={() =>
              setIsPopupOpen(
                !isPopupOpen
              )
            }
            className={`
              flex items-center rounded-xl cursor-pointer

              transition-all duration-200

              hover:bg-white/[0.04]

              p-1.5

              ${
                isCollapsed
                  ? 'justify-center'
                  : 'justify-between gap-3'
              }

              ${
                isPopupOpen
                  ? 'bg-white/[0.04]'
                  : ''
              }
            `}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="
                  h-8 w-8
                  shrink-0
                  rounded-full
                  overflow-hidden
                  bg-[#0f6e56]
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
                      text-[11px]
                      font-semibold
                      text-white
                    "
                  >
                    {initials}
                  </div>
                )}
              </div>

              {!isCollapsed && (
                <div className="min-w-0">
                  <p
                    className="
                      truncate text-[13px]
                      text-white/90
                      font-medium leading-tight
                    "
                  >
                    {user?.display_name ||
                      'clientonly'}
                  </p>

                  <p className="text-[11px] text-white/30 mt-0.5">
                    {planName ? `${planName.charAt(0).toUpperCase()}${planName.slice(1)} plan` : '—'}
                  </p>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <ChevronDown
                size={14}
                className={`
                  text-white/30 mr-1

                  transition-transform duration-200

                  ${
                    isPopupOpen
                      ? 'rotate-180'
                      : ''
                  }
                `}
              />
            )}
          </div>

          {/* ───────────────── Popup ───────────────── */}
          {isPopupOpen && (
            <div
              className="
                absolute left-4 bottom-[72px]

                w-[200px]

                z-50

                rounded-2xl

                border border-white/[0.08]

                bg-[#0A231C]/95

                backdrop-blur-xl

                shadow-2xl shadow-black/40

                overflow-hidden
              "
            >
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="truncate text-[13px] font-medium text-white">
                  {user?.display_name ||
                    'clientonly'}
                </p>

                <p className="truncate text-[11px] text-white/40 mt-0.5">
                  {user?.email ||
                    'clientonly@yopmail.com'}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsPopupOpen(false)
                  setShowSettings(true)
                }}
                className="
                  flex items-center gap-3

                  w-full text-left

                  px-4 py-2.5

                  text-[13px]
                  text-white/65

                  hover:bg-white/[0.04]
                  hover:text-white

                  transition-all duration-200
                "
              >

                <Settings
                  size={15}
                  className="opacity-60"
                />

                <span>Settings</span>

              </button>

              <div className="border-t border-white/[0.06]" />

              <button
                onClick={() => {
                  setIsPopupOpen(
                    false
                  )
                  logout()
                }}
                className="
                  flex items-center gap-3

                  w-full text-left

                  px-4 py-2.5

                  text-[13px]
                  text-red-400

                  hover:bg-red-500/[0.08]

                  transition-all duration-200
                "
              >
                <LogOut
                  size={15}
                  className="opacity-80"
                />

                <span className="font-medium">
                  Sign out
                </span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ───────────────── Mobile Profile Popup ───────────────── */}
      {isPopupOpen && (
        <div
          ref={mobilePopupRef}
          className="
            lg:hidden

            fixed bottom-[76px] right-4

            w-[240px]

            z-50

            rounded-2xl

            border border-white/[0.08]

            bg-[#0A231C]/95

            backdrop-blur-xl

            shadow-2xl shadow-black/40

            overflow-hidden
          "
        >
          {/* User info */}
          <div className="px-4 py-3 border-b border-white/[0.06]">
            <p className="truncate text-[13px] font-medium text-white">
              {user?.display_name || 'Provider'}
            </p>

            <p className="truncate text-[11px] text-white/40 mt-0.5">
              {user?.email || ''}
            </p>
          </div>

          {/* Portal Switcher (Redirect on Mobile) */}
          <div className="p-2 border-b border-white/[0.06]">
            <button
              onClick={() => {
                setIsPopupOpen(false)
                window.location.replace(appUrl(null, '/portals'))
              }}
              className="
                flex items-center justify-between
                w-full text-left
                p-2
                rounded-xl
                bg-white/[0.04]
                hover:bg-white/[0.08]
                transition-all duration-200
                group
              "
            >
              <div className="flex items-center gap-2 min-w-0">
                {tenant?.logo_url ? (
                  <img
                    src={tenant.logo_url}
                    alt={tenant.name}
                    className="h-5 w-5 rounded-md object-cover shrink-0"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-md shrink-0 flex items-center justify-center bg-[#1A2A25] text-[9px] font-semibold text-white">
                    {tenant?.name
                      ?.split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() ?? '??'}
                  </div>
                )}
                <span className="truncate text-[12px] font-medium text-white/80 group-hover:text-white transition-colors">
                  {tenant?.name || 'Switch Workspace'}
                </span>
              </div>
              <ChevronDown size={14} className="text-white/40 group-hover:text-white/80 transition-colors shrink-0" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={() => {
              setIsPopupOpen(false)
              setShowSettings(true)
            }}
            className="
              flex items-center gap-3

              w-full text-left

              px-4 py-2.5

              text-[13px]
              text-white/65

              hover:bg-white/[0.04]
              hover:text-white

              transition-all duration-200
            "
          >
            <Settings
              size={15}
              className="opacity-60"
            />

            <span>Settings</span>
          </button>

          <div className="border-t border-white/[0.06]" />

          <button
            onClick={() => {
              setIsPopupOpen(false)
              logout()
            }}
            className="
              flex items-center gap-3

              w-full text-left

              px-4 py-2.5

              text-[13px]
              text-red-400

              hover:bg-red-500/[0.08]
            "
          >
            <LogOut
              size={15}
              className="opacity-80"
            />

            <span className="font-medium">
              Sign out
            </span>
          </button>
        </div>
      )}

      {/* ───────────────── Mobile Bottom Nav ───────────────── */}
      <div
        ref={mobileRef}
        className="
          fixed bottom-0 left-0 right-0

          z-50

          lg:hidden

          border-t border-white/[0.06]

          bg-[#071A15]/95

          backdrop-blur-xl
        "
      >
        <div className="flex items-center justify-around px-2 py-2">
          {NAV_ITEMS.map(
            ({
              to,
              icon: Icon,
              label,
            }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setIsPopupOpen(false)}
                className={({
                  isActive,
                }) =>
                  `
                  flex flex-col items-center justify-center

                  gap-1

                  min-w-[60px]

                  rounded-xl

                  px-2.5 py-1.5

                  transition-all duration-200

                  ${
                    isActive
                      ? `
                        text-white
                        bg-white/[0.06]
                      `
                      : `
                        text-white/45
                      `
                  }
                `
                }
              >
                <Icon size={17} />

                <span className="text-[9px]">
                  {label}
                </span>
              </NavLink>
            )
          )}

          {/* Profile Nav Item */}
          <div
            className={`
              relative flex flex-col items-center justify-center
              gap-1
              min-w-[60px]
              rounded-xl
              px-2.5 py-1.5
              transition-all duration-200
              cursor-pointer
              ${
                isPopupOpen
                  ? `
                    text-white
                    bg-white/[0.06]
                  `
                  : `
                    text-white/45
                  `
              }
            `}
            onClick={(e) => {
              e.stopPropagation()
              setIsPopupOpen(!isPopupOpen)
            }}
          >
            <div
              className={`
                h-[18px]
                w-[18px]
                rounded-full
                overflow-hidden
                bg-[#0f6e56]
                shadow-sm
                transition-transform duration-200
                ${
                  isPopupOpen
                    ? 'scale-110 ring-2 ring-white/20'
                    : ''
                }
              `}
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

            <span className="text-[9px]">
              Profile
            </span>
          </div>
        </div>
      </div>
      {showSettings && (
        <ProviderSettingsModal
          open={showSettings}
          onClose={() =>
            setShowSettings(false)
          }
        />
      )}
    </>
  )
}