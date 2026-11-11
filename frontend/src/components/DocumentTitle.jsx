import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES = {
  '/': 'Home',
  '/login': 'Sign in',
  '/signup': 'Create account',
  '/verify-email': 'Verify email',
  '/forgot-password': 'Forgot password',
  '/reset-password': 'Reset password',
  '/setup-workspace': 'Set up workspace',
  '/portals': 'Your workspaces',
  '/upgrade': 'Plans and billing',
  '/accept-invite': 'Accept invitation',
  '/client-login': 'Client sign in',
  '/dashboard': 'Overview',
  '/portal': 'Overview',
  '/clients': 'Clients',
  '/requests': 'Requests',
  '/my-requests': 'My requests',
  '/activity': 'Activity',
  '/workspace-not-found': 'Workspace not found',
  '/grove-admin/login': 'Admin sign in',
  '/grove-admin/dashboard': 'Admin overview',
  '/grove-admin/tenants': 'Workspaces',
  '/grove-admin/users': 'Users',
  '/grove-admin/plans': 'Plans',
}

// One title owner keeps route changes and async tenant branding from competing.
export default function DocumentTitle() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '').toLowerCase() || '/'
  const page = PAGE_TITLES[path]
    || (/^\/(?:my-requests|requests)\/[^/]+$/.test(path) ? 'Request details' : null)
    || (/^\/clients\/[^/]+$/.test(path) ? 'Client details' : 'Page not found')

  useEffect(() => {
    document.title = `${page} | Groven`
  }, [page])

  return null
}
