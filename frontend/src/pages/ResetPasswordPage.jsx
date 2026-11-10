import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import AuthShell from '../components/layout/AuthShell'
import { getSubdomain } from '../utils/domain'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const subdomain = getSubdomain()
  const isClientPortal = !!subdomain

  // ─────────────────────────────────────────────────────────
  // PASSWORD VALIDATION
  // ─────────────────────────────────────────────────────────
  const getStrength = (pw) => {
    const checks = {
      length: pw.length >= 8,
      uppercase: /[A-Z]/.test(pw),
      lowercase: /[a-z]/.test(pw),
      number: /[0-9]/.test(pw),
      special: /[^A-Za-z0-9]/.test(pw),
    }

    const passed = Object.values(checks).filter(Boolean).length

    if (!pw) {
      return {
        label: '',
        width: '0%',
        color: '',
        checks,
      }
    }

    if (passed <= 2) {
      return {
        label: 'Weak',
        width: '33%',
        color: 'bg-red-500',
        checks,
      }
    }

    if (passed <= 4) {
      return {
        label: 'Medium',
        width: '66%',
        color: 'bg-yellow-400',
        checks,
      }
    }

    return {
      label: 'Strong',
      width: '100%',
      color: 'bg-primary',
      checks,
    }
  }

  const strength = getStrength(password)

  // ─────────────────────────────────────────────────────────
  // SUBMIT
  // ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    const passwordValidation =
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)

    if (!passwordValidation) {
      setError(
        'Password must contain at least 8 characters, including uppercase, lowercase, number, and special character.'
      )
      return
    }

    if (!token) {
      setError('Invalid reset link. Please request a new one.')
      return
    }

    setLoading(true)

    try {
      if (isClientPortal) {
        await authApi.clientResetPassword(token, password)
      } else {
        await authApi.resetPassword(token, password)
      }
      
      setSuccess(true)
    } catch (err) {
      const d = err.response?.data

      if (d?.message) {
        setError(d.message)
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell centered tenantAware>
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-light text-primary-ink">{success ? <CheckCircle2 size={24} /> : <LockKeyhole size={23} />}</div>
      <h1 className="text-[30px] font-medium leading-tight tracking-[-0.04em]">{success ? 'Password updated' : 'Set a new password'}</h1>
      <p className="mt-3 text-sm leading-7 text-text-sub">{success ? 'Your password has been updated. Sign in to get back to your workspace.' : 'Choose a strong password to keep your workspace secure.'}</p>
      {!success && <form onSubmit={handleSubmit} className="mt-7 space-y-5">
        {error && <p role="alert" className="rounded-xl bg-status-danger-bg p-3 text-sm text-status-danger-text">{error}</p>}
        {!token && <p role="alert" className="rounded-xl bg-status-review-bg p-3 text-sm text-status-review-text">This link is missing its reset token. <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link>.</p>}
        <div><label htmlFor="reset-password" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><LockKeyhole size={14} />New password</label><div className="relative"><input id="reset-password" type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} autoComplete="new-password" required placeholder="Create a secure password" className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 pr-12 text-sm text-text-main placeholder:text-text-dim outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)} className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-dim">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border"><div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} /></div>
          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{[['length', '8+ characters'], ['uppercase', 'An uppercase letter'], ['lowercase', 'A lowercase letter'], ['number', 'A number'], ['special', 'A special character']].map(([key, label]) => <span key={key} className={`flex items-center gap-1.5 text-[10px] ${strength.checks[key] ? 'text-primary-ink' : 'text-text-dim'}`}><Check size={12} className={strength.checks[key] ? '' : 'opacity-30'} />{label}</span>)}</div>
        </div>
        <div><label htmlFor="reset-confirm" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><LockKeyhole size={14} />Confirm password</label><input id="reset-confirm" type={showPassword ? 'text' : 'password'} value={confirm} onChange={event => setConfirm(event.target.value)} autoComplete="new-password" required placeholder="Enter your new password again" className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 text-sm text-text-main placeholder:text-text-dim outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" /></div>
        <button type="submit" disabled={loading || !token} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60">{loading ? 'Updating password…' : <>Update password <ArrowRight size={16} /></>}</button>
      </form>}
      <Link to={isClientPortal ? '/client-login' : '/login'} className={success ? 'mt-7 flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-sm font-semibold text-on-primary hover:bg-primary-dark' : 'mt-7 flex min-h-10 items-center justify-center gap-2 text-xs font-medium text-text-sub hover:text-primary-ink'}>{success ? <>Continue to sign in <ArrowRight size={15} /></> : <><ArrowLeft size={14} />Back to sign in</>}</Link>
    </AuthShell>
  )
}
