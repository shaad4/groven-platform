import { Navigate, Outlet } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectIsAdminAuth } from '../features/adminAuth/adminAuthSlice'

// AdminProtectedRoute 
// Requires an active admin session. Unauthenticated visitors are
// sent to the admin login screen — never the tenant/provider one.

export function AdminProtectedRoute() {
  const isAdminAuth = useSelector(selectIsAdminAuth)

  if (!isAdminAuth) {
    return <Navigate to="/grove-admin/login" replace />
  }

  return <Outlet />
}

// AdminGuestRoute
// Redirects an already-logged-in admin away from the login page.

export function AdminGuestRoute() {
  const isAdminAuth = useSelector(selectIsAdminAuth)

  if (isAdminAuth) {
    return <Navigate to="/grove-admin/dashboard" replace />
  }

  return <Outlet />
}