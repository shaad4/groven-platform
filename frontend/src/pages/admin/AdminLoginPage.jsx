import { useState } from 'react'
import AppearanceMenu from '../../components/marketing/AppearanceMenu'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Eye, EyeOff, AlertCircle, ShieldCheck, Lock } from 'lucide-react'
import adminAuthApi from '../../api/admin/adminAuth.api'
import { setAdminCredentials } from '../../features/adminAuth/adminAuthSlice'
import { setAdminLoggingOut } from '../../api/admin/adminAuthResponseInterceptor'

export default function AdminLoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [lockedUntilMessage, setLockedUntilMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!email.trim()) errs.email = 'Email is required'
    else if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) errs.email = 'Enter a valid email'
    if (!password.trim()) errs.password = 'Password is required'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLockedUntilMessage('')
    if (!validate()) return

    setLoading(true)
    try {
      const { data } = await adminAuthApi.login({ email, password })
      setAdminLoggingOut(false)
      dispatch(setAdminCredentials({ accessToken: data.access, admin: data.admin }))
      navigate('/grove-admin/dashboard', { replace: true })
    } catch (err) {
      const status = err?.response?.status
      const message = err?.response?.data?.message

      if (status === 429) {
        setLockedUntilMessage(message || 'Too many failed attempts. This IP is temporarily locked.')
      } else {
        setError(message || 'Invalid email or password.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-layout-page px-5 py-24">
      <div className="absolute right-5 top-5"><AppearanceMenu /></div>
      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light border border-border">
            <ShieldCheck size={20} className="text-primary-ink" />
          </div>
          <h1 className="text-[20px] font-semibold text-text-main">Groven Admin</h1>
          <p className="mt-1.5 text-[13px] text-text-sub">
            Restricted internal access only.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-layout-card shadow-soft p-7">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-status-danger-text/30 bg-[#E2483D]/10 px-3.5 py-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-status-danger-text" />
              <p className="text-[13px] text-status-danger-text">{error}</p>
            </div>
          )}

          {lockedUntilMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-status-review-text/30 bg-[#D9A33B]/10 px-3.5 py-2.5">
              <Lock size={15} className="mt-0.5 shrink-0 text-status-review-text" />
              <p className="text-[13px] text-status-review-text">{lockedUntilMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-[12px] font-medium text-text-sub">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }))
                }}
                placeholder="admin@groven.in"
                autoComplete="email"
                autoFocus
                className={`h-11 w-full rounded-lg border bg-layout-page px-3.5 text-[13px] text-text-main outline-none transition-all placeholder:text-text-dim ${
                  fieldErrors.email
                    ? 'border-status-danger-text/50'
                    : 'border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-status-danger-text">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1.5 block text-[12px] font-medium text-text-sub">
                Password
              </label>
              <div className="relative">
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }))
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`h-11 w-full rounded-lg border bg-layout-page px-3.5 pr-11 text-[13px] text-text-main outline-none transition-all placeholder:text-text-dim ${
                    fieldErrors.password
                      ? 'border-status-danger-text/50'
                      : 'border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-sub"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-status-danger-text">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-lg bg-primary text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-text-dim">
          5 failed attempts will lock this IP for 15 minutes.
        </p>
      </div>
    </div>
  )
}