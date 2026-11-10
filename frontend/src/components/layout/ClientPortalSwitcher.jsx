import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Check, ChevronDown, ExternalLink } from 'lucide-react'

import {
  selectTenant,
  selectMemberships,
  selectTotalPortalCount,
} from '../../features/auth/authSlice'

import { appUrl } from '../../utils/urls'

// ───────────────── Avatar ─────────────────
function PortalAvatar({ name, logo, size = 'sm' }) {
  const initials =
    name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '??'

  const dim =
    size === 'lg'
      ? 'h-8 w-8 rounded-lg text-xs'
      : 'h-6 w-6 rounded-md text-[10px]'

  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className={`${dim} shrink-0 object-cover shadow-sm`}
      />
    )
  }

  return (
    <div
      className={`
        ${dim}
        shrink-0
        flex items-center justify-center
        bg-sidebar
        text-white
        font-bold
        tracking-wider
        shadow-sm
      `}
    >
      {initials}
    </div>
  )
}

// ───────────────── Component ─────────────────
export default function ClientPortalSwitcher({ isMobile = false }) {
  const tenant = useSelector(selectTenant)
  const memberships = useSelector(selectMemberships)
  const totalPortals = useSelector(selectTotalPortalCount)

  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const providerPortals = memberships?.provider_portals ?? []
  const clientPortals = memberships?.client_portals ?? []
  const showDropdown = totalPortals > 1

  // ───────────────── Navigation ─────────────────
  const goTo = (slug, role) => {
    setOpen(false)

    const path =
      role === 'provider'
        ? '/dashboard'
        : '/portal'

    window.location.replace(
      appUrl(slug, path)
    )
  }

  return (
    <div className="relative" ref={ref}>
      {/* ───────────────── Trigger ───────────────── */}
      <button
        onClick={() => {
          if (isMobile) {
            window.location.replace(appUrl(null, '/portals'))
          } else if (showDropdown) {
            setOpen((v) => !v)
          }
        }}
        className={`
          flex w-full items-center gap-3
          rounded-xl
          px-2 py-2
          transition-all duration-200
          hover:bg-surface
          ${(isMobile || showDropdown) ? 'cursor-pointer' : 'cursor-default'}
        `}
      >
        <PortalAvatar name={tenant?.name} logo={tenant?.logo_url} size="lg" />

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-text-main leading-tight">
            {tenant?.name ?? 'Portal'}
          </p>
          <p className="text-xs text-text-dim mt-0.5">
            Client portal
          </p>
        </div>

        {((!isMobile && showDropdown) || isMobile) && (
          <ChevronDown
            size={14}
            className={`
              shrink-0
              text-text-dim
              transition-transform duration-200
              ${open ? 'rotate-180' : ''}
            `}
          />
        )}
      </button>

      {/* ───────────────── Dropdown ───────────────── */}
      {open && !isMobile && (
        <div
          className="
            absolute
            left-[calc(100%+8px)]
            bottom-0
            z-[80]
            w-[240px]
            overflow-hidden
            rounded-xl
            border border-border/50
            bg-white/95 backdrop-blur-xl
            shadow-soft
            animate-in fade-in slide-in-from-left-2 duration-200
          "
        >
          {/* ───────────────── Workspaces ───────────────── */}
          {providerPortals.length > 0 && (
            <div className="p-1.5">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-dim">
                Workspaces
              </p>

              {providerPortals.map((portal) => {
                const isCurrent = portal.tenant_slug === tenant?.slug

                return (
                  <button
                    key={portal.tenant_slug}
                    onClick={() => !isCurrent && goTo(portal.tenant_slug, 'provider')}
                    className={`
                      flex w-full items-center gap-2.5
                      rounded-lg
                      px-2.5 py-2
                      text-left
                      transition-all duration-150
                      ${isCurrent ? 'bg-surface' : 'hover:bg-surface/60'}
                    `}
                  >
                    <PortalAvatar name={portal.tenant_name} logo={portal.tenant_logo} />

                    <span className="flex-1 truncate text-sm text-text-main font-medium">
                      {portal.tenant_name}
                    </span>

                    {isCurrent && (
                      <Check size={14} className="shrink-0 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Divider */}
          {providerPortals.length > 0 && clientPortals.length > 0 && (
            <div className="mx-2 h-px bg-border/50" />
          )}

          {/* ───────────────── Client portals ───────────────── */}
          {clientPortals.length > 0 && (
            <div className="p-1.5">
              <p className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-text-dim">
                Client portals
              </p>

              {clientPortals.map((portal) => {
                const isCurrent = portal.tenant_slug === tenant?.slug

                return (
                  <button
                    key={portal.tenant_slug}
                    onClick={() => !isCurrent && goTo(portal.tenant_slug, 'client')}
                    className={`
                      flex w-full items-center gap-2.5
                      rounded-lg
                      px-2.5 py-2
                      text-left
                      transition-all duration-150
                      ${isCurrent ? 'bg-surface' : 'hover:bg-surface/60'}
                    `}
                  >
                    <PortalAvatar name={portal.tenant_name} logo={portal.tenant_logo} />

                    <span className="flex-1 truncate text-sm text-text-main font-medium">
                      {portal.tenant_name}
                    </span>

                    {isCurrent && (
                      <Check size={14} className="shrink-0 text-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* ───────────────── Footer ───────────────── */}
          <div className="border-t border-border/50 p-1.5 bg-surface/30">
            <button
              onClick={() => {
                setOpen(false)
                window.location.replace(
                  appUrl(null, '/portals')
                )
              }}
              className="
                flex w-full items-center gap-2.5
                rounded-lg
                px-2.5 py-2
                text-left
                transition-all duration-150
                hover:bg-surface
              "
            >
              <ExternalLink size={14} className="text-text-dim" />
              <span className="text-xs font-medium text-text-sub">
                All portals
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}