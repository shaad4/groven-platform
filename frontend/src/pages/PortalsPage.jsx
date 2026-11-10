import { useSelector } from 'react-redux'
import {
  selectCurrentUser,
  selectMemberships,
} from '../features/auth/authSlice'

import { useAuth } from '../context/AuthContext'

import groveLogo from '../assets/Grove_transparent_logo(Green).png'

import { appUrl } from '../utils/urls'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function getNameColor(name = '') {

  let hash = 0

  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash % 360)

  return {
    bg: `hsl(${hue}, 68%, 48%)`,
    bgDark: `hsl(${hue}, 68%, 38%)`,
    soft: `hsl(${hue}, 72%, 94%)`,
    text: `hsl(${hue}, 58%, 22%)`,
  }
}


// ─────────────────────────────────────────────────────────────
// Background
// ─────────────────────────────────────────────────────────────

function GridPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >

      <defs>

        <pattern
          id="grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >

          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="#0F6E56"
            strokeWidth="0.4"
            strokeOpacity="0.12"
          />

        </pattern>

      </defs>

      <rect
        width="100%"
        height="100%"
        fill="url(#grid)"
      />

    </svg>
  )
}

function AccentOrbs() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >

      <div className="orb orb-1" />
      <div className="orb orb-2" />

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Portal Card
// ─────────────────────────────────────────────────────────────

function PortalCard({
  portal,
  role,
  suspended = false,
  onClick,
}) {

  const isProvider = role === 'provider'

  const initials = getInitials(portal.tenant_name)

  const colors = getNameColor(portal.tenant_name)

  return (
    <button
      onClick={suspended ? undefined : onClick}
      disabled={suspended}
      className={`portal-card group w-full text-left ${suspended ? 'portal-card-suspended' : ''}`}
      aria-label={`${portal.tenant_name} ${
        suspended
          ? '— suspended, unavailable'
          : isProvider
            ? 'dashboard'
            : 'portal'
      }`}
      aria-disabled={suspended}
    >

      <div className="portal-card-inner">

        {/* Avatar */}

        <div
          className="portal-avatar"
          style={
            !portal.tenant_logo
              ? {
                  background: suspended
                    ? '#D8DCD8'
                    : `
                      linear-gradient(
                        135deg,
                        ${colors.bg} 0%,
                        ${colors.bgDark} 100%
                      )
                    `,
                  color: '#fff',
                }
              : {}
          }
        >

          {portal.tenant_logo ? (

            <img
              src={portal.tenant_logo}
              alt=""
              className="h-full w-full rounded-[10px] object-cover"
              style={suspended ? { filter: 'grayscale(1)', opacity: 0.5 } : {}}
            />

          ) : (

            <span>{initials}</span>

          )}

        </div>

        {/* Info */}

        <div className="min-w-0 flex-1">

          <div className="flex items-center gap-2">

            <h3 className="portal-name truncate">
              {portal.tenant_name}
            </h3>

            <span
              className={`portal-badge ${
                suspended
                  ? 'badge-suspended'
                  : isProvider
                    ? 'badge-provider'
                    : 'badge-client'
              }`}
            >
              {suspended
                ? 'Suspended'
                : isProvider
                  ? 'Your portal'
                  : 'Client'}
            </span>

          </div>

          <p className="portal-slug">
            {suspended
              ? 'Access paused by the provider'
              : `${portal.tenant_slug}.groven.in`}
          </p>

        </div>

        {/* Arrow — hidden entirely when suspended, nothing to navigate to */}

        {!suspended && (
          <div className="portal-arrow">

            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >

              <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

            </svg>

          </div>
        )}

      </div>

      {!suspended && (
        <div
          className="portal-shimmer"
          aria-hidden="true"
        />
      )}

    </button>
  )
}

// ─────────────────────────────────────────────────────────────
// Section Label
// ─────────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return (
    <p className="section-label">
      {children}
    </p>
  )
}

// ─────────────────────────────────────────────────────────────
// Empty State
// ─────────────────────────────────────────────────────────────

function EmptyState({ onSetup }) {
  return (
    <div className="empty-state">

      <div
        className="empty-icon"
        aria-hidden="true"
      >

        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          fill="none"
        >

          <rect
            x="3"
            y="3"
            width="22"
            height="22"
            rx="6"
            stroke="#0F6E56"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />

          <path
            d="M14 9v10M9 14h10"
            stroke="#0F6E56"
            strokeWidth="1.5"
            strokeLinecap="round"
          />

        </svg>

      </div>

      <p className="empty-text">
        No portals yet
      </p>

      <button
        onClick={onSetup}
        className="empty-cta"
      >
        Create your workspace
      </button>

    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────

export default function PortalsPage() {

  const user = useSelector(selectCurrentUser)

  const memberships = useSelector(selectMemberships)

  const { logout } = useAuth()

  const providerPortals =
    memberships?.provider_portals ?? []

  const clientPortals =
    memberships?.client_portals ?? []

  const hasProvider =
    providerPortals.length > 0

  const hasClient =
    clientPortals.length > 0

  const hasAny =
    hasProvider || hasClient

  const goToPortal = (slug, role) => {

    window.location.replace(
      appUrl(
        slug,
        role === 'provider'
          ? '/dashboard'
          : '/portal'
      )
    )

  }


  if (!memberships) {
    return (
      <div className="loading-screen" role="status" aria-label="Loading portals">
        <div className="loading-spinner" />
      </div>
    )
  }

  const firstName =
    user?.display_name?.split(' ')[0] ?? ''

  return (
    <>
      <style>{`

        .portals-root {
          min-height: 100vh;
          background: #F7F8F7;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1.25rem;
          position: relative;
          overflow: hidden;
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.12;
          animation: orbDrift 12s ease-in-out infinite alternate;
        }

        .orb-1 {
          width: 420px;
          height: 420px;
          background: #0F6E56;
          top: -120px;
          right: -100px;
        }

        .orb-2 {
          width: 280px;
          height: 280px;
          background: #1D9E75;
          bottom: -80px;
          left: -60px;
        }

        @keyframes orbDrift {

          from {
            transform: translate(0, 0) scale(1);
          }

          to {
            transform: translate(30px, 20px) scale(1.08);
          }

        }

        .portals-card {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 520px;
          background: #ffffff;
          border: 1px solid #E8EAE8;
          border-radius: 28px;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 8px 32px rgba(15,110,86,0.07),
            0 24px 64px rgba(0,0,0,0.06);
          overflow: hidden;
        }

        .card-header {
          padding: 28px 28px 24px;
          border-bottom: 1px solid #F0F2F0;
        }

        .card-logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
        }

        .card-logo img {
          height: 26px;
          object-fit: contain;
        }

        .greeting {
          font-size: 22px;
          font-weight: 600;
          color: #0A2E24;
          line-height: 1.25;
          letter-spacing: -0.3px;
        }

        .greeting-sub {
          margin-top: 4px;
          font-size: 13.5px;
          color: #9EA89E;
        }

        .section-label {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #B8BEB8;
          padding: 16px 28px 8px;
        }

        .portal-list {
          padding: 0 12px 12px;
        }

        .portal-card {
          display: block;
          width: 100%;
          background: transparent;
          border: none;
          border-radius: 14px;
          padding: 0;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: background 0.15s ease;
          margin-bottom: 2px;
        }

        .portal-card:hover {
          background: #F7FAF9;
        }

        .portal-card-inner {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 13px 16px;
        }

        .portal-avatar {
          flex-shrink: 0;
          width: 44px;
          height: 44px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.5px;
          color: #fff;
          transition: transform 0.2s ease;
          overflow: hidden;
        }

        .portal-card:hover .portal-avatar {
          transform: scale(1.04);
        }

        .portal-name {
          font-size: 14.5px;
          font-weight: 600;
          color: #141A14;
          line-height: 1.3;
        }

        .portal-slug {
          font-size: 12px;
          color: #B8BEB8;
          margin-top: 2px;
        }

        .portal-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 6px;
          padding: 3px 7px;
        }

        .badge-provider {
          background: #E6F5F0;
          color: #0F6E56;
        }

        .badge-client {
          background: #F3F4F3;
          color: #6B7A6B;
        }
          
        .portal-card-suspended {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .portal-card-suspended:hover {
          background: transparent;
        }

        .portal-card-suspended .portal-name {
          color: #8B958C;
        }

        .badge-suspended {
          background: #FDF1EF;
          color: #C73A30;
        }

        .portal-arrow {
          flex-shrink: 0;
          color: #D4D9D4;
          transition: color 0.15s ease, transform 0.15s ease;
        }

        .portal-card:hover .portal-arrow {
          color: #0F6E56;
          transform: translateX(3px);
        }

        .portal-shimmer {
          position: absolute;
          bottom: 0;
          left: 16px;
          right: 16px;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            #0F6E56 50%,
            transparent
          );
          opacity: 0;
          transform: scaleX(0.4);
          transition:
            opacity 0.2s ease,
            transform 0.25s ease;
        }

        .portal-card:hover .portal-shimmer {
          opacity: 0.35;
          transform: scaleX(1);
        }

        .create-cta {
          display: flex;
          align-items: center;
          gap: 10px;
          width: calc(100% - 24px);
          margin: 4px 12px 12px;
          padding: 13px 16px;
          background: transparent;
          border: 1.5px dashed #D4D9D4;
          border-radius: 14px;
          font-size: 13.5px;
          font-weight: 500;
          color: #9EA89E;
          cursor: pointer;
          transition: all 0.18s ease;
        }

        .create-cta:hover {
          border-color: #0F6E56;
          color: #0F6E56;
          background: #F7FAF9;
        }

        .workspace-prompt {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin: 4px 12px 16px;
          padding: 14px 16px;
          background: #F0F7F4;
          border: 1px solid #C8E6DC;
          border-radius: 14px;
        }

        .workspace-prompt-text {
          min-width: 0;
        }

        .workspace-prompt-title {
          font-size: 13.5px;
          font-weight: 600;
          color: #0A2E24;
          margin: 0 0 2px;
        }

        .workspace-prompt-sub {
          font-size: 12px;
          color: #6B9E8A;
          margin: 0;
        }

        .workspace-prompt-btn {
          flex-shrink: 0;
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
          background: #0F6E56;
          border: none;
          border-radius: 9px;
          padding: 8px 14px;
          cursor: pointer;
          transition: background 0.15s ease;
          white-space: nowrap;
        }

        .workspace-prompt-btn:hover {
          background: #0C5B48;
        }

        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 28px;
          text-align: center;
        }

        .empty-icon {
          width: 60px;
          height: 60px;
          border-radius: 16px;
          background: #F0F7F4;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }

        .empty-text {
          font-size: 14px;
          color: #9EA89E;
          margin-bottom: 16px;
        }

        .empty-cta {
          font-size: 13.5px;
          font-weight: 500;
          color: #0F6E56;
          background: #E6F5F0;
          border: none;
          border-radius: 10px;
          padding: 9px 18px;
          cursor: pointer;
        }

        .card-footer {
          border-top: 1px solid #F0F2F0;
          padding: 14px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .footer-email {
          font-size: 12px;
          color: #B8BEB8;
        }

        .footer-email strong {
          color: #6B7A6B;
          font-weight: 500;
        }

        .sign-out-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          font-weight: 500;
          color: #9EA89E;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
        }

        .sign-out-btn:hover {
          color: #D0503A;
          background: #FDF2F0;
        }

        .loading-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F7F8F7;
        }

        .loading-spinner {
          width: 28px;
          height: 28px;
          border: 2.5px solid #D4E9E2;
          border-top-color: #0F6E56;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 640px) {

          .portals-root {
            padding: 1rem;
          }

          .portals-card {
            border-radius: 24px;
          }

          .card-header {
            padding: 24px 22px 20px;
          }

          .section-label {
            padding-left: 22px;
          }

          .card-footer {
            padding: 14px 18px;
            gap: 12px;
          }

          .footer-email {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

        }

      `}</style>

      <div className="portals-root">

        <GridPattern />

        <AccentOrbs />

        <div
          className="portals-card"
          role="main"
        >

          {/* HEADER */}

          <div className="card-header">

            <div className="card-logo">

              <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
                <img
                  src={groveLogo}
                  alt="Groven"
                />
              </a>

            </div>

            <h1 className="greeting">

              {firstName
                ? `Welcome back, ${firstName}.`
                : 'Welcome back.'}

            </h1>

           <p className="greeting-sub">
            {hasProvider
              ? 'Choose a portal to open.'
              : hasClient && !hasProvider
              ? 'Your portals and workspace options.'
              : 'Get started with Groven.'}
          </p>

          </div>

          {/* EMPTY */}

          {!hasAny && (

            <EmptyState
              onSetup={() =>
                window.location.href = '/setup-workspace'
              }
            />

          )}

          {/* CLIENT */}

          {hasClient && (

            <>
              <SectionLabel>
                Portals you've joined
              </SectionLabel>

              <div className="portal-list">

              {clientPortals.map(portal => (

                <PortalCard
                  key={portal.tenant_slug}
                  portal={portal}
                  role="client"
                  suspended={portal.is_suspended}
                  onClick={() =>
                    goToPortal(
                      portal.tenant_slug,
                      'client'
                    )
                  }
                />

              ))}

              </div>

            </>

          )}

          {/* PROVIDER */}

          {hasProvider && (

            <>
              <SectionLabel>
                Your portal
              </SectionLabel>

              <div className="portal-list">

                {providerPortals.map(portal => (

                  <PortalCard
                    key={portal.tenant_slug}
                    portal={portal}
                    role="provider"
                    suspended={portal.is_suspended}
                    onClick={() =>
                      goToPortal(
                        portal.tenant_slug,
                        'provider'
                      )
                    }
                  />

                ))}

              </div>

            </>

          )}

          {/* CTA */}

        
          {!hasProvider && hasAny && (

            <div className="workspace-prompt">
              <div className="workspace-prompt-text">
                <p className="workspace-prompt-title">Start your own workspace</p>
                <p className="workspace-prompt-sub">
                  Manage clients and requests with your own Groven portal.
                </p>
              </div>
              <button
                className="workspace-prompt-btn"
                onClick={() => window.location.href = '/setup-workspace'}
              >
                Get started free
              </button>
            </div>
          )}

          {/* FOOTER */}

          <div className="card-footer">

            <p className="footer-email">

              Signed in as{' '}

              <strong>
                {user?.email}
              </strong>

            </p>

            <button
              className="sign-out-btn"
              onClick={logout}
            >

              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >

                <path
                  d="M5.5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.5M9.5 10l2.5-3-2.5-3M12 7H5.5"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

              </svg>

              Sign out

            </button>

          </div>

        </div>

      </div>

    </>
  )
}