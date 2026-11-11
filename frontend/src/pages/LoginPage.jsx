import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ArrowRight, Mail, LockKeyhole } from 'lucide-react'
import AuthShell from '../components/layout/AuthShell'
import { useDispatch } from 'react-redux'

import { useAuth } from '../context/AuthContext'
import { setMemberships } from '../features/auth/authSlice'
import { authApi } from '../api/auth.api'

import { setLoggingOut } from '../api/interceptors/authResponseInterceptor'

import { appUrl } from '../utils/urls'

async function redirectAfterLogin(data, dispatch, saveSession) {
  const { access, user, tenant, membership_count } = data

  saveSession({ accessToken: access, user, tenant, membership_count })

  if (membership_count === 1 && user.role == 'provider' && tenant?.slug) {
    window.location.replace(
      appUrl(tenant.slug, '/dashboard')
    )
    return
  }


  try {
    const res = await authApi.getMemberships(access)
    dispatch(setMemberships(res.data))
  } catch { /* Memberships can be restored by the portal chooser. */ }

  window.location.replace(
    appUrl(null, '/portals')
  )
}

export default function LoginPage() {
  const { saveSession } = useAuth()
  const dispatch = useDispatch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  //Email/password login
  const validate = () => {
    const errs = {}
    if (!email.trim())
      errs.email = 'Email is required'
    else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email))
      errs.email = 'Enter a valid email'
    if (!password.trim())
      errs.password = 'Password is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setLoading(true)
    try {
      const { data } = await authApi.login({ email, password })

      setLoggingOut(false)

      if (data.needs_workspace && data.membership_count === 0) {
        saveSession({ accessToken: data.access, user: data.user, tenant: null, membership_count: 0 })
        window.location.replace(
          appUrl(null, '/setup-workspace')
        )
        return
      }

      await redirectAfterLogin(data, dispatch, saveSession)
    } catch (err) {
      setError(
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        'Invalid email or password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="mb-8"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-ink">Sign in</p><h1 className="mt-3 text-[36px] font-medium leading-tight tracking-[-0.04em] text-text-main">Welcome back</h1><p className="mt-3 text-sm leading-6 text-text-sub">Sign in to access your workspaces.</p></div>
      {error && <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-status-danger-text/20 bg-status-danger-bg px-4 py-3 text-status-danger-text"><AlertCircle size={18} className="mt-0.5 shrink-0" /><p className="text-sm">{error}</p></div>}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="login-email" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><Mail size={14} />Email address</label>
          <input id="login-email" type="email" value={email} onChange={e => { setEmail(e.target.value); if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' })) }} placeholder="you@yourstudio.com" autoComplete="email" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? 'login-email-error' : undefined} className={`h-12 w-full rounded-xl border bg-layout-card px-4 text-sm text-text-main placeholder:text-text-dim outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10 ${fieldErrors.email ? 'border-status-danger-text' : 'border-border'}`} />
          {fieldErrors.email && <p id="login-email-error" className="mt-1.5 text-xs text-status-danger-text">{fieldErrors.email}</p>}
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-2"><label htmlFor="login-password" className="flex items-center gap-2 text-xs font-semibold text-text-sub"><LockKeyhole size={14} />Password</label><Link to="/forgot-password" className="text-xs font-medium text-primary-ink hover:underline">Forgot password?</Link></div>
          <div className="relative"><input id="login-password" type={showPassword ? 'text' : 'password'} value={password} onChange={e => { setPassword(e.target.value); if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' })) }} placeholder="Enter your password" autoComplete="current-password" aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? 'login-password-error' : undefined} className={`h-12 w-full rounded-xl border bg-layout-card px-4 pr-12 text-sm text-text-main placeholder:text-text-dim outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10 ${fieldErrors.password ? 'border-status-danger-text' : 'border-border'}`} /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(v => !v)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-dim hover:text-text-main">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          {fieldErrors.password && <p id="login-password-error" className="mt-1.5 text-xs text-status-danger-text">{fieldErrors.password}</p>}
        </div>
        <button type="submit" disabled={loading} aria-busy={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Signing in…' : <>Sign in <ArrowRight size={16} /></>}</button>
        <p className="pt-2 text-center text-xs leading-6 text-text-sub">New to Groven? <Link to="/signup" className="font-semibold text-primary-ink hover:underline">Create your workspace</Link></p>
      </form>
    </AuthShell>
  )
}
