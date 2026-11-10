import { useState } from 'react'
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
    <div className="flex min-h-screen items-center justify-center bg-[#070D0A] px-6">
      {/* ambient grid texture */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      <div className="relative w-full max-w-[400px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.06] border border-white/[0.08]">
            <ShieldCheck size={20} className="text-[#1D9E75]" />
          </div>
          <h1 className="text-[20px] font-semibold text-white">Groven Admin</h1>
          <p className="mt-1.5 text-[13px] text-white/40">
            Restricted internal access only.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#E2483D]/30 bg-[#E2483D]/10 px-3.5 py-2.5">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-[#F1857E]" />
              <p className="text-[13px] text-[#F1857E]">{error}</p>
            </div>
          )}

          {lockedUntilMessage && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-[#D9A33B]/30 bg-[#D9A33B]/10 px-3.5 py-2.5">
              <Lock size={15} className="mt-0.5 shrink-0 text-[#E8C170]" />
              <p className="text-[13px] text-[#E8C170]">{lockedUntilMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/55">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: '' }))
                }}
                placeholder="admin@groven.in"
                autoComplete="email"
                autoFocus
                className={`h-11 w-full rounded-lg border bg-white/[0.04] px-3.5 text-[13px] text-white outline-none transition-all placeholder:text-white/25 ${
                  fieldErrors.email
                    ? 'border-[#E2483D]/50'
                    : 'border-white/[0.08] focus:border-[#1D9E75]/50 focus:ring-2 focus:ring-[#1D9E75]/15'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-[11px] text-[#F1857E]">{fieldErrors.email}</p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-medium text-white/55">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: '' }))
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`h-11 w-full rounded-lg border bg-white/[0.04] px-3.5 pr-11 text-[13px] text-white outline-none transition-all placeholder:text-white/25 ${
                    fieldErrors.password
                      ? 'border-[#E2483D]/50'
                      : 'border-white/[0.08] focus:border-[#1D9E75]/50 focus:ring-2 focus:ring-[#1D9E75]/15'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-[11px] text-[#F1857E]">{fieldErrors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 h-11 w-full rounded-lg bg-[#1D9E75] text-[13px] font-medium text-white transition-colors hover:bg-[#188364] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-white/25">
          5 failed attempts will lock this IP for 15 minutes.
        </p>
      </div>
    </div>
  )
}