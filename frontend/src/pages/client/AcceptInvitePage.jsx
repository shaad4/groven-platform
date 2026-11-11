import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, AlertCircle, CheckCircle2 } from 'lucide-react'
import { authApi } from '../../api/auth.api'
import { useAuth } from '../../context/AuthContext'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import { appUrl } from '../../utils/urls'
import PortalAuthShell from '../../components/client/PortalAuthShell'
import { Skeleton, InlinePending } from '../../components/ui/Skeleton'

function getStrength(password) {
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
  return { score, label: ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score] }
}

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { saveSession } = useAuth()
  const { tenantInfo } = useTenantBranding()
  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [inviteData, setInviteData] = useState(null)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)
  const redirectTimer = useRef(null)
  const strength = getStrength(password)
  const isExistingUser = inviteData?.already_has_account
  const workspace = tenantInfo || { name: inviteData?.workspace_name }

  useEffect(() => {
    let active = true
    setValidating(true); setTokenError('')
    if (!token) { setTokenError('No invite token found. Open the full link in your invitation email.'); setValidating(false); return }
    authApi.validateInviteToken(token).then(({ data }) => { if (active) setInviteData(data.data) }).catch(error => { if (active) setTokenError(error?.response?.data?.message || 'This invitation is invalid or has expired.') }).finally(() => { if (active) setValidating(false) })
    return () => { active = false }
  }, [token])
  useEffect(() => () => clearTimeout(redirectTimer.current), [])

  const handleSubmit = async event => {
    event.preventDefault(); setSubmitError('')
    if (!isExistingUser && password.length < 8) { setSubmitError('Password must be at least 8 characters.'); return }
    if (!isExistingUser && password !== confirm) { setSubmitError('Passwords do not match.'); return }
    setSubmitting(true)
    try {
      const { data } = await authApi.acceptInvite(isExistingUser ? { token } : { token, password })
      const { access, user, tenant } = data.data
      saveSession({ accessToken: access, user, tenant }); setDone(true)
      redirectTimer.current = setTimeout(() => window.location.replace(appUrl(tenant.slug, '/portal')), 1000)
    } catch (error) { setSubmitError(error?.response?.data?.message || 'We couldn’t accept the invitation. Please try again.') }
    finally { setSubmitting(false) }
  }

  const name = inviteData?.client_name?.split(' ')[0]
  return <PortalAuthShell tenant={workspace} title={done ? 'You’re all set.' : tokenError ? 'Let’s find your invite.' : validating ? 'Opening your invitation.' : `You’re invited${name ? `, ${name}` : ''}.`} description={done ? 'Your workspace is ready. Taking you there now…' : tokenError ? 'This link couldn’t be verified.' : isExistingUser ? `Connect your existing account to ${workspace.name || 'this workspace'}.` : `Create your password to join ${workspace.name || 'your private workspace'}.`}>
    {validating ? <div role="status" aria-label="Checking your invitation" aria-busy="true" className="space-y-5">{[0, 1, 2].map(index => <div key={index} className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-12 w-full rounded-xl" /></div>)}<Skeleton className="h-12 w-full rounded-xl" /></div> : tokenError ? <div role="alert" className="rounded-2xl border border-border bg-layout-card p-6"><AlertCircle className="mb-3 text-text-sub" /><p className="text-sm leading-6 text-text-sub">{tokenError}</p><p className="mt-4 text-sm font-medium">Contact your provider to resend your invitation.</p></div> : done ? <div role="status" className="rounded-2xl border border-primary/20 bg-primary-light p-6 dark:border-border dark:bg-layout-card"><CheckCircle2 size={30} className="text-primary-ink" /><p className="mt-4 text-sm text-text-sub">You can now share requests, follow progress, and review deliveries.</p></div> : <form onSubmit={handleSubmit} className="space-y-5">
      <div><label htmlFor="invite-email" className="mb-2 flex items-center gap-2 text-sm font-medium"><Mail size={15} className="text-text-dim" />Email address</label><input id="invite-email" readOnly value={inviteData?.client_email || ''} className="h-12 w-full rounded-xl border border-border bg-surface px-4 text-sm text-text-sub" /><p className="mt-2 text-xs text-text-dim">This invitation is linked to this email address.</p></div>
      {!isExistingUser && <>
        <div><label htmlFor="invite-password" className="mb-2 flex items-center gap-2 text-sm font-medium"><LockKeyhole size={15} className="text-text-dim" />Create a password</label><div className="relative"><input id="invite-password" type={showPw ? 'text' : 'password'} autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} placeholder="At least 8 characters" className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 pr-12 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary-light" /><button type="button" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(value => !value)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-sub hover:bg-surface">{showPw ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>{password && <div className="mt-3 flex items-center gap-2">{[1, 2, 3, 4].map(step => <span key={step} className={`h-1 flex-1 rounded-full ${step <= strength.score ? 'bg-primary' : 'bg-border'}`} />)}<span className="ml-1 text-xs text-text-sub">{strength.label}</span></div>}</div>
        <div><label htmlFor="invite-confirm" className="mb-2 block text-sm font-medium">Confirm password</label><div className="relative"><input id="invite-confirm" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={event => setConfirm(event.target.value)} placeholder="Repeat your password" className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 pr-12 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary-light" />{confirm && confirm === password && <Check size={18} className="absolute right-4 top-4 text-primary-ink" />}</div></div>
      </>}
      {isExistingUser && <p className="rounded-xl border border-primary/20 bg-primary-light p-4 dark:border-border dark:bg-layout-card text-sm leading-6 text-text-sub">Your account is ready. Accept this invitation to add <strong className="font-semibold text-text-main">{workspace.name}</strong> to your portals. You can keep using your existing password.</p>}
      {submitError && <p role="alert" className="rounded-xl bg-status-danger-bg p-4 text-sm text-status-danger-text">{submitError}</p>}
      <button type="submit" disabled={submitting} aria-busy={submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60">{submitting ? <><InlinePending label="Joining workspace" />Joining workspace…</> : <>{isExistingUser ? 'Accept invitation' : 'Create account & join'}<ArrowRight size={17} /></>}</button>
    </form>}
  </PortalAuthShell>
}
