import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Mail, MailCheck } from 'lucide-react'
import { authApi } from '../api/auth.api'
import { getSubdomain } from '../utils/domain'
import AuthShell from '../components/layout/AuthShell'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const isClientPortal = !!getSubdomain()

  const handleSubmit = async event => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isClientPortal) await authApi.clientForgotPassword(email)
      else await authApi.forgotPassword(email)
      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell centered tenantAware>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary-ink">{sent ? <MailCheck size={23} /> : <Mail size={23} />}</div>
      <h1 className="text-[30px] font-medium leading-tight tracking-[-0.04em]">{sent ? 'Check your inbox.' : 'Reset your password'}</h1>
      <p className="mt-3 text-sm leading-7 text-text-sub">{sent ? <>If an account exists for <strong className="break-words font-medium text-text-main">{email}</strong>, you’ll receive a link to reset your password.</> : 'Enter your email to receive a password reset link.'}</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger-text">{error}</p>}
      {sent ? <div className="mt-7 rounded-xl border border-border bg-surface p-4 text-xs leading-6 text-text-sub">No email yet? Check your spam folder, or <button type="button" onClick={() => setSent(false)} className="font-semibold text-primary-ink hover:underline">try again</button>.</div> : <form onSubmit={handleSubmit} className="mt-7 space-y-5"><div><label htmlFor="recovery-email" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><Mail size={14} />Email address</label><input id="recovery-email" type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" required className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 text-sm text-text-main placeholder:text-text-dim outline-none transition-colors focus:border-primary focus:ring-4 focus:ring-primary/10" /></div><button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60">{loading ? 'Sending…' : <>Send reset link <ArrowRight size={16} /></>}</button></form>}
      <Link to={isClientPortal ? '/client-login' : '/login'} className="mt-7 flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-text-sub hover:text-primary-ink"><ArrowLeft size={14} />Back to sign in</Link>
    </AuthShell>
  )
}
