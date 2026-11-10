import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, Star } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { useGoogleLogin } from '@react-oauth/google'

import { useAuth } from '../context/AuthContext'
import { setMemberships } from '../features/auth/authSlice'
import { authApi } from '../api/auth.api'
import groveLogo from '../assets/Grove_transparent_logo(Green).png'

import { setLoggingOut } from '../api/interceptors/authResponseInterceptor'

import { appUrl } from '../utils/urls'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4" />
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05" />
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
    </svg>
  )
}

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
  } catch (_) { /* silent */ }

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
  const [googleLoading, setGoogleLoading] = useState(false)

  //Google OAuth
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      console.log('Google token response:', tokenResponse) // ← add this
      setGoogleLoading(true)
      setError('')
      try {
        const { data } = await authApi.googleAuth(tokenResponse.access_token)
        console.log('Backend response:', data)

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
        console.log('Error response:', err.response) // add this
        setError(err.response?.data?.message || 'Google sign-in failed. Please try again.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: (err) => {
      console.log('Google onError:', err) // ← add this
      setError('Google sign-in failed. Please try again.')
    },
    flow: 'implicit',
  })

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
    <div className="flex min-h-screen bg-[#FAFBFA]">

      {/* ── LEFT: form ─────────────────────────────────────────── */}
      <div className="flex w-full items-center justify-center px-6 py-10 lg:w-1/2 lg:px-24">
        <div className="w-full max-w-md">

          <div className="mb-10">
            <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
              <img src={groveLogo} alt="Groven" className="h-8 object-contain" />
            </a>
          </div>

          <div className="mb-8">
            <h1 className="text-[38px] font-semibold leading-tight text-[#0A2E24]">
              Welcome back
            </h1>
            <p className="mt-2 text-sm text-[#8B948B]">
              Sign in to access your portals.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle size={18} className="mt-0.5 text-red-500" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">

            {/* Email */}
            <div>
              <label className="mb-2 block text-sm font-medium text-[#4A544A]">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors(p => ({ ...p, email: '' }))
                }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className={`h-12 w-full rounded-xl border bg-white px-4 text-sm outline-none transition-all ${fieldErrors.email
                  ? 'border-red-400'
                  : 'border-[#E5E7EB] focus:border-[#0F6E56] focus:ring-4 focus:ring-[#0F6E56]/10'
                  }`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-[#4A544A]">Password</label>
                <Link to="/forgot-password" className="text-xs text-[#0F6E56] hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(p => ({ ...p, password: '' }))
                  }}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`h-12 w-full rounded-xl border bg-white px-4 pr-12 text-sm outline-none transition-all ${fieldErrors.password
                    ? 'border-red-400'
                    : 'border-[#E5E7EB] focus:border-[#0F6E56] focus:ring-4 focus:ring-[#0F6E56]/10'
                    }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-xs text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="h-12 w-full rounded-xl bg-[#0F6E56] font-medium text-white transition-all hover:bg-[#0C5B48] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-[#E5E7EB]" />
              <span className="text-xs text-[#9EA89E]">or</span>
              <div className="h-px flex-1 bg-[#E5E7EB]" />
            </div>

            {/* Google */}
            <button
              type="button"
              disabled={googleLoading || loading}
              onClick={() => googleLogin()}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#E5E7EB] bg-white text-sm font-medium text-[#141A14] shadow-sm transition-all hover:bg-[#F7F8F7] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {googleLoading
                ? <svg className="h-4 w-4 animate-spin text-[#9EA89E]" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                : <GoogleIcon />
              }
              {googleLoading ? 'Connecting…' : 'Continue with Google'}
            </button>

            <p className="text-center text-sm text-[#9EA89E]">
              Don't have a portal?{' '}
              <Link to="/signup" className="font-medium text-[#0F6E56] underline">
                Create one free
              </Link>
            </p>

          </form>
        </div>
      </div>

      {/* ── RIGHT: testimonial ──────────────────────────────────── */}
      <div className="hidden flex-col justify-between bg-[#F7F8F7] px-12 py-16 lg:flex lg:w-1/2">
        <div className="flex flex-1 items-center">
          <div className="w-full rounded-2xl border border-[#E5E7EB] bg-white p-10 shadow-sm">
            <div className="mb-6 flex gap-1 text-[#0F6E56]">
              {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
            </div>
            <p className="text-lg italic leading-9 text-[#141A14]">
              Groven changed how I handle client relationships entirely. Every project has
              a home now. My clients send me thank-you notes instead of chasing messages —
              that's never happened before.
            </p>
            <div className="mt-10 flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#E6F5F0] font-semibold text-[#085041]">
                NK
              </div>
              <div>
                <h4 className="font-medium text-[#141A14]">Nisha Kreations</h4>
                <p className="text-sm text-[#9EA89E]">UI/UX Freelancer · Groven Pro</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 border-t border-[#E5E7EB] pt-10">
          {[
            ['500+', 'Portals created'],
            ['3,200+', 'Clients onboarded'],
            ['98%', 'Provider retention'],
          ].map(([stat, label]) => (
            <div key={label} className="text-center">
              <h3 className="text-3xl font-semibold text-[#0A2E24]">{stat}</h3>
              <p className="mt-1 text-sm text-[#9EA89E]">{label}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}