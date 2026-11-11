import { PageSkeleton } from '../components/ui/Skeleton'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { getSubdomain } from '../utils/domain'

export default function TenantGuard({ children }) {
  const [status, setStatus] = useState('checking')
  const subdomain = getSubdomain()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === '/workspace-not-found') {
      setStatus('valid')
      return
    }

    if (!subdomain) {
      setStatus('valid')
      return
    }

    authApi.checkTenantSlug(subdomain)
      .then(res => {
        if (res.data.valid) {
          setStatus('valid')
        } else {
          navigate('/workspace-not-found', { replace: true })
        }
      })
      .catch(() => {
        navigate('/workspace-not-found', { replace: true })
      })
  }, [subdomain, location.pathname])

  if (status === 'checking') return (
    <div className="min-h-dvh bg-layout-page"><PageSkeleton label="Opening workspace" /></div>
  )

  return children
}