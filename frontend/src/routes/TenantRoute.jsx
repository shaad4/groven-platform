import {
  Navigate,
} from 'react-router-dom'

import {
  getSubdomain,
} from '../utils/domain'

import {
  useAuth,
} from '../context/AuthContext'

import { appUrl } from '../utils/urls'

export default function TenantRoute({ children }) {

  const {
    tenant,
    loading,
    isAuth,
  } = useAuth()

  const subdomain = getSubdomain()

  if (loading) {
    return null
  }

  // not authenticated
  if (!isAuth) {
    window.location.replace(
      appUrl(subdomain, '/client-login')
    )
    return <Navigate to="/login" replace />
  }

  if (!tenant?.slug) {
    return (
      <Navigate
        to="/setup-workspace"
        replace
      />
    )
  }

 
  if (tenant.slug !== subdomain) {
    window.location.replace(
      appUrl(tenant.slug, window.location.pathname)
    )
    return null
  }

  return children
}