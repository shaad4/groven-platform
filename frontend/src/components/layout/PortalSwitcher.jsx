import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import {
  Check,
  ChevronDown,
  ExternalLink,
} from 'lucide-react'

import {
  selectCurrentUser,
  selectTenant,
  selectMemberships,
  selectTotalPortalCount,
} from '../../features/auth/authSlice'

import { appUrl } from '../../utils/urls'

function PortalAvatar({
  name,
  logo,
}) {
  const initials =
    name
      ?.split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ?? '??'

  if (logo) {
    return (
      <img
        src={logo}
        alt={name}
        className="
          h-5 w-5
          rounded-md
          object-cover
          shrink-0
        "
      />
    )
  }

  return (
    <div
      className="
        h-5 w-5
        rounded-md
        shrink-0

        flex items-center justify-center

        bg-[#1A2A25]

        text-[9px]
        font-semibold
        text-white
      "
    >
      {initials}
    </div>
  )
}

export default function PortalSwitcher() {
  const user = useSelector(selectCurrentUser)

  const tenant = useSelector(selectTenant)

  const memberships = useSelector(
    selectMemberships
  )

  const totalPortals = useSelector(
    selectTotalPortalCount
  )

  const [open, setOpen] = useState(false)

  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (
        ref.current &&
        !ref.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handler
    )

    return () =>
      document.removeEventListener(
        'mousedown',
        handler
      )
  }, [])

  const providerPortals =
    memberships?.provider_portals ?? []

  const clientPortals =
    memberships?.client_portals ?? []

  const goTo = (slug, role) => {
    setOpen(false)

    const path =
      role === 'provider'
        ? 'dashboard'
        : 'portal'

    window.location.replace(
      appUrl(slug, `/${path}`)
    )
  }

  const showDropdown = totalPortals > 1

  return (
    <div
      className="relative"
      ref={ref}
    >
      {/* ───────────────── Trigger ───────────────── */}
      <button
        onClick={() =>
          showDropdown &&
          setOpen((v) => !v)
        }
        className={`
          flex w-full items-center gap-2

          rounded-xl

          px-2.5 py-2

          transition-all duration-150

          hover:bg-white/[0.04]

          ${
            showDropdown
              ? 'cursor-pointer'
              : 'cursor-default'
          }
        `}
      >
        <PortalAvatar
          name={tenant?.name}
          logo={tenant?.logo_url}
        />

        <div className="min-w-0 flex-1 text-left">
          <p
            className="
              truncate

              text-[13px]
              font-medium
              text-white
            "
          >
            {tenant?.name ?? 'Groven'}
          </p>
        </div>

        {showDropdown && (
          <ChevronDown
            size={13}
            className={`
              shrink-0

              text-white/35

              transition-transform duration-200

              ${
                open
                  ? 'rotate-180'
                  : ''
              }
            `}
          />
        )}
      </button>

      {/* ───────────────── Dropdown ───────────────── */}
      {open && (
        <div
          className="
            absolute left-0 top-full

            z-50

            mt-1.5

            w-[220px]

            overflow-hidden

            rounded-2xl

            border border-white/[0.06]

            bg-[#0B1512]/98

            backdrop-blur-xl

            shadow-[0_20px_60px_rgba(0,0,0,0.45)]

            animate-in fade-in slide-in-from-top-2
            duration-150
          "
        >
          {/* Workspace Section */}
          {providerPortals.length > 0 && (
            <div className="p-1.5">
              <p
                className="
                  px-2 py-1.5

                  text-[10px]
                  font-medium

                  uppercase

                  tracking-[0.12em]

                  text-white/30
                "
              >
                Workspaces
              </p>

              {providerPortals.map(
                (portal) => {
                  const isCurrent =
                    portal.tenant_slug ===
                    tenant?.slug

                  return (
                    <button
                      key={
                        portal.tenant_slug
                      }
                      onClick={() =>
                        !isCurrent &&
                        goTo(
                          portal.tenant_slug,
                          'provider'
                        )
                      }
                      className={`
                        flex w-full items-center gap-2.5

                        rounded-xl

                        px-2 py-2

                        text-left

                        transition-all duration-150

                        ${
                          isCurrent
                            ? `
                              bg-white/[0.05]
                            `
                            : `
                              hover:bg-white/[0.04]
                            `
                        }
                      `}
                    >
                      <PortalAvatar
                        name={
                          portal.tenant_name
                        }
                        logo={
                          portal.tenant_logo
                        }
                      />

                      <span
                        className="
                          flex-1 truncate

                          text-[13px]
                          text-white/90
                        "
                      >
                        {portal.tenant_name}
                      </span>

                      {isCurrent && (
                        <Check
                          size={12}
                          className="text-emerald-400 shrink-0"
                        />
                      )}
                    </button>
                  )
                }
              )}
            </div>
          )}

          {/* Divider */}
          {providerPortals.length >
            0 &&
            clientPortals.length >
              0 && (
              <div className="mx-2 border-t border-white/[0.05]" />
            )}

          {/* Client Portals */}
          {clientPortals.length > 0 && (
            <div className="p-1.5">
              <p
                className="
                  px-2 py-1.5

                  text-[10px]
                  font-medium

                  uppercase

                  tracking-[0.12em]

                  text-white/30
                "
              >
                Client portals
              </p>

              {clientPortals.map(
                (portal) => {
                  const isCurrent =
                    portal.tenant_slug ===
                    tenant?.slug

                  return (
                    <button
                      key={
                        portal.tenant_slug
                      }
                      onClick={() =>
                        !isCurrent &&
                        goTo(
                          portal.tenant_slug,
                          'client'
                        )
                      }
                      className={`
                        flex w-full items-center gap-2.5

                        rounded-xl

                        px-2 py-2

                        text-left

                        transition-all duration-150

                        ${
                          isCurrent
                            ? `
                              bg-white/[0.05]
                            `
                            : `
                              hover:bg-white/[0.04]
                            `
                        }
                      `}
                    >
                      <PortalAvatar
                        name={
                          portal.tenant_name
                        }
                        logo={
                          portal.tenant_logo
                        }
                      />

                      <span
                        className="
                          flex-1 truncate

                          text-[13px]
                          text-white/90
                        "
                      >
                        {portal.tenant_name}
                      </span>

                      {isCurrent && (
                        <Check
                          size={12}
                          className="text-emerald-400 shrink-0"
                        />
                      )}
                    </button>
                  )
                }
              )}
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-white/[0.05] p-1.5">
            <button
              onClick={() => {
                setOpen(false)

                window.location.replace(
                  appUrl(null, '/portals')
                )
              }}
              className="
                flex w-full items-center gap-2.5

                rounded-xl

                px-2 py-2

                text-left

                transition-all duration-150

                hover:bg-white/[0.04]
              "
            >
              <ExternalLink
                size={12}
                className="text-white/35"
              />

              <span className="text-[12px] text-white/50">
                All portals
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}