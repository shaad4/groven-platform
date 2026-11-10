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
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
      <svg className="h-8 w-8 animate-spin text-[#0f6e56]" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
      </svg>
    </div>
  )

  return children
}