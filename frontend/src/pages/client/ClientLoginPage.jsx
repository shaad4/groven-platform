import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ArrowRight, Loader2, Mail, LockKeyhole } from 'lucide-react'
import { authApi } from '../../api/auth.api'
import { useAuth } from '../../context/AuthContext'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { appUrl } from '../../utils/urls'
import PortalAuthShell from '../../components/client/PortalAuthShell'

export default function ClientLoginPage() {
  const { saveSession } = useAuth()
  const { tenantInfo, loading: tenantLoading, error: tenantError } = useTenantBranding()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return }
    setLoading(true)
    try {
      const { data } = await authApi.clientLogin({ email: email.trim(), password })
      saveSession({ accessToken: data.access, user: data.user, tenant: data.tenant })
      window.location.replace(appUrl(data.tenant.slug, '/portal'))
    } catch (err) { setError(err?.response?.data?.message || 'Invalid email or password.') }
    finally { setLoading(false) }
  }

  return <PortalAuthShell title="Welcome back." description={`Sign in to continue working with ${tenantInfo?.name || 'your team'}.`}>
    {tenantLoading ? <div role="status" className="flex items-center gap-3 py-10 text-sm text-text-sub"><Loader2 size={20} className="animate-spin" />Opening your workspace…</div> : tenantError ? <div role="alert" className="rounded-2xl border border-border bg-layout-card p-6"><AlertCircle className="mb-4 text-text-sub" /><h3 className="font-semibold">Workspace unavailable</h3><p className="mt-2 text-sm leading-6 text-text-sub">We couldn’t open this portal. Check the address or contact your provider for a new link.</p><button className="mt-5 text-sm font-semibold text-primary-ink" onClick={() => window.location.reload()}>Try again</button></div> : <form onSubmit={handleSubmit} className="space-y-5">
      <div><label htmlFor="client-email" className="mb-2 flex items-center gap-2 text-sm font-medium"><Mail size={15} className="text-text-dim" />Email address</label><input id="client-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@company.com" autoComplete="email" required className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 text-sm text-text-main outline-none transition-colors placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary-light" /></div>
      <div><div className="mb-2 flex items-center justify-between gap-3"><label htmlFor="client-password" className="flex items-center gap-2 text-sm font-medium"><LockKeyhole size={15} className="text-text-dim" />Password</label><Link to="/forgot-password" className="text-xs font-medium text-primary-ink hover:underline">Forgot password?</Link></div><div className="relative"><input id="client-password" type={showPw ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Enter your password" autoComplete="current-password" required className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 pr-12 text-sm text-text-main outline-none placeholder:text-text-dim focus:border-primary focus:ring-4 focus:ring-primary-light" /><button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(value => !value)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-sub hover:bg-surface">{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></div>
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-status-danger-text/20 bg-status-danger-bg p-4 text-sm text-status-danger-text"><AlertCircle size={17} className="mt-0.5 shrink-0" />{error}</div>}
      <button disabled={loading} type="submit" className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60">{loading ? <><Loader2 size={18} className="animate-spin" />Signing in…</> : <>Sign in to your portal<ArrowRight size={17} /></>}</button>
      <p className="pt-2 text-center text-xs leading-5 text-text-dim">Use the email address your provider invited.</p>
    </form>}
  </PortalAuthShell>
}
