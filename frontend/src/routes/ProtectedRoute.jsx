import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { getSubdomain } from '../utils/domain'
import { useAuth } from '../context/AuthContext'
import { appUrl } from '../utils/urls'



// ─── ProtectedRoute ───────────────────────────────────────────
// Requires authentication. Unauthenticated users go to the
// correct login page based on whether a subdomain is present.

export function ProtectedRoute() {
  const { isAuth, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F7]">
        <div className="h-8 w-8 rounded-full border-2 border-[#D4E9E2] border-t-[#0F6E56] animate-spin" />
      </div>
    )
  }

  if (!isAuth) {
    const subdomain = getSubdomain()

    if (subdomain) {
      const isClientPath = window.location.pathname.startsWith('/portal')
      if (isClientPath) {
        window.location.replace(appUrl(subdomain, '/client-login'))
      } else {
        window.location.replace(appUrl(null, '/login'))
      }
      return null
    }

    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

// ─── GuestRoute ───────────────────────────────────────────────
// Redirects already-authenticated users away from auth pages.

export function GuestRoute() {
  const { isAuth, user, tenant, loading } = useAuth()
  const membership_count = useSelector(s => s.auth.membership_count)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F7]">
        <div className="h-8 w-8 rounded-full border-2 border-[#D4E9E2] border-t-[#0F6E56] animate-spin" />
      </div>
    )
  }
  if (!isAuth) return <Outlet />

  if (user?.role === 'provider') {
    if (tenant?.slug) {
      window.location.replace(appUrl(tenant.slug, '/dashboard'))
      return null
    }
    if (membership_count > 1) {
      return <Navigate to="/portals" replace />
    }
    return <Navigate to="/setup-workspace" replace />
  }

  if (user?.role === 'client') {

    const subdomain = getSubdomain()

    if (subdomain) {
      window.location.replace(
        appUrl(subdomain, '/portal')
      )
      return null
    }

    return <Navigate to="/portals" replace />
  }

  return <Navigate to="/portals" replace />
}

// ─── SetupRoute ───────────────────────────────────────────────
// For users who are authenticated but have no provider workspace yet.
//
// Who can reach this:
//   - Provider who just verified email (no workspace yet)
//   - Client-only user who clicked "Create your own workspace"
//
// Who gets ejected:
//   - Unauthenticated users
//   - Anyone who already has a provider workspace (tenant.slug is set)

export function SetupRoute() {
  const { isAuth, user, tenant, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8F7]">
        <div className="h-8 w-8 rounded-full border-2 border-[#D4E9E2] border-t-[#0F6E56] animate-spin" />
      </div>
    )
  }

  if (!isAuth) {
    const subdomain = getSubdomain()
    if (subdomain) {
      window.location.replace(appUrl(subdomain, '/client-login'))
      return null
    }
    return <Navigate to="/login" replace />
  }

  // Only eject if they are a provider — clients are allowed through
  // to create their own workspace regardless of tenant in Redux
  if (user?.role === 'provider' && tenant?.slug) {
    window.location.replace(appUrl(tenant.slug, '/dashboard'))
    return null
  }

  return <Outlet />
}