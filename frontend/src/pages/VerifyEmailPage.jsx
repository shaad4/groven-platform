import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle2, XCircle } from 'lucide-react'
import { authApi } from '../api/auth.api'
import { useAuth } from '../context/AuthContext'
import AuthShell from '../components/layout/AuthShell'
import { appUrl } from '../utils/urls'
import { Skeleton } from '../components/ui/Skeleton'

export default function VerifyEmailPage() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const navigate = useNavigate()
  const { saveSession } = useAuth()
  const saveSessionRef = useRef(saveSession)
  const [status, setStatus] = useState('verifying')

  useEffect(() => {
    let ignore = false
    let redirectTimer
    const continueToSetup = () => {
      setStatus('success')
      redirectTimer = setTimeout(() => window.location.replace(appUrl(null, '/setup-workspace')), 1200)
    }
    const verify = async () => {
      try {
        if (!token) { setStatus('error'); return }
        const res = await authApi.verifyEmail(token)
        if (ignore) return
        const payload = res.data.data
        saveSessionRef.current({ accessToken: payload.access, user: payload.user, tenant: null })
        continueToSetup()
      } catch (err) {
        if (ignore) return
        const errorData = err.response?.data
        const message = errorData?.message || errorData?.error?.message || errorData?.detail || ''
        // Preserve the existing flow for an already verified email.
        if (['already', 'used', 'verified'].some(word => message.toLowerCase().includes(word))) {
          continueToSetup()
          return
        }
        setStatus('error')
      }
    }
    verify()
    return () => { ignore = true; clearTimeout(redirectTimer) }
  }, [token])

  return (
    <AuthShell centered>
      <div role="status" aria-live="polite" className="text-center">
        {status === 'verifying' ? <Skeleton className="mx-auto mb-6 h-16 w-16 rounded-2xl" /> : <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${status === 'error' ? 'bg-status-danger-bg text-status-danger-text' : 'bg-primary-light text-primary-ink'}`}>{status === 'success' ? <CheckCircle2 size={30} /> : <XCircle size={30} />}</div>}
        <h1 className="text-[30px] font-medium tracking-[-0.04em]">{status === 'verifying' ? 'Verifying your email.' : status === 'success' ? 'Email verified' : 'Verification failed'}</h1>
        <p className="mt-3 text-sm leading-7 text-text-sub">{status === 'verifying' ? 'Just a moment while we confirm your email address.' : status === 'success' ? 'Your email is verified. We’re getting your workspace setup ready.' : 'This verification link is invalid or has expired. Return to sign up to request a new one.'}</p>
        {status === 'success' && <p className="mt-6 text-xs text-text-sub">Taking you to workspace setup</p>}
        {status === 'error' && <button type="button" onClick={() => navigate('/signup')} className="mt-7 h-12 w-full rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary-dark">Return to sign up</button>}
      </div>
    </AuthShell>
  )
}
