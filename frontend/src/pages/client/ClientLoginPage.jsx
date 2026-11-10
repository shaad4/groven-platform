import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react'

import groveLogoGreen from "../../assets/Grove_transparent_logo(Green).png"
import groveLogoWhite from "../../assets/Grove_transparent_logo(White).png"

import { authApi } from '../../api/auth.api'
import { useAuth } from '../../context/AuthContext'
import { getSubdomain } from '../../utils/domain'
import { appUrl } from '../../utils/urls'

import { getBrandColors } from '../../utils/branding'

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function rootUrl(path) {
  return appUrl(null, path)
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

// ─────────────────────────────────────────────────────────────
// Dynamic Left Panel Background
// ─────────────────────────────────────────────────────────────

function LeftPanelBg({ bg1, bg2, bg3 }) {

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden"
      style={{
        background: `
          radial-gradient(circle at top left, rgba(255,255,255,0.06), transparent 40%),
          radial-gradient(circle at bottom right, rgba(255,255,255,0.04), transparent 40%),
          linear-gradient(145deg, ${bg1}, ${bg2} 58%, ${bg3})
        `,
      }}
    >
      {/* GRID PATTERN */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]">
        <defs>
          <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.5" fill="white" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dots)" />
      </svg>

      {/* AMBIENT BLOBS */}
      <div className="absolute w-[420px] h-[420px] rounded-full bg-white/5 blur-3xl -top-[120px] -right-[120px]" />
      <div className="absolute w-[240px] h-[240px] rounded-full bg-white/5 blur-2xl bottom-10 -left-20" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Avatar Component
// ─────────────────────────────────────────────────────────────

function TenantAvatar({ name, logoUrl, size = 64, className = '' }) {
  const initials = getInitials(name || '')

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        style={{ width: size, height: size }}
        className={`rounded-2xl object-cover shadow-sm ${className}`}
      />
    )
  }

  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className={`rounded-2xl flex items-center justify-center font-bold tracking-wider shadow-sm ${className}`}
    >
      {initials || '?'}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Login Page
// ─────────────────────────────────────────────────────────────

export default function ClientLoginPage() {
  const { saveSession } = useAuth()
  const subdomain = getSubdomain()

  const [tenant, setTenant] = useState(null)
  const [tenantErr, setTenantErr] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    authApi.getTenantInfo()
      .then(res => setTenant(res.data))
      .catch(() => setTenantErr(true))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    try {
      const res = await authApi.clientLogin({
        email: email.trim(),
        password,
      })

      const { access, user, tenant: t } = res.data

      saveSession({
        accessToken: access,
        user,
        tenant: t,
      })

      window.location.replace(
        appUrl(t.slug, '/portal')
      )
    } catch (err) {
      setError(err?.response?.data?.message || 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  const workspaceName = tenant?.name || (
    subdomain ? subdomain.charAt(0).toUpperCase() + subdomain.slice(1) : 'Your Portal'
  )

  const {
    accent,
    accentDark,
    accentSoft,
    bg1,
    bg2,
    bg3,
  } = getBrandColors(
    tenant?.accent_color
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
        .font-serif-italic { font-family: 'Instrument Serif', serif; font-style: italic; }
      `}</style>

      <div 
        className="min-h-[100dvh] flex flex-col md:flex-row font-sans selection:bg-primary-light selection:text-primary-dark"
        style={{
          background: `radial-gradient(circle at top, ${accentSoft} 0%, #f9faf9 100%)`
        }}
      >

        {/* ─── LEFT PANEL (DESKTOP) ─── */}
        <div className="hidden md:flex flex-col justify-between relative w-[45%] max-w-[540px] shrink-0 p-10 lg:p-14 overflow-hidden">
          <LeftPanelBg
            bg1={bg1}
            bg2={bg2}
            bg3={bg3}
          />

          {/* Top: Groven Branding */}
          <a href={rootUrl('/')} className="relative z-10 block w-fit hover:opacity-80 transition-opacity">
            <img src={groveLogoWhite} alt="Groven" className="h-8 w-auto object-contain" />
          </a>

          {/* Center: Tenant Branding */}
          <div className="relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="mb-8">
              <TenantAvatar
                name={workspaceName}
                logoUrl={tenant?.logo_url}
                size={80}
                className="bg-white/10 border border-white/20 text-white backdrop-blur-md"
              />
            </div>
            <h1 className="text-[40px] lg:text-[46px] leading-[1.05] font-bold text-white tracking-tight mb-4">
              {workspaceName}
              <br />
              <span className="text-white/70 font-serif-italic font-normal">client portal</span>
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-[320px]">

              {tenant?.tagline ||

                'Sign in to manage requests, collaborate with your provider, and stay synced with your workflow.'}

            </p>
          </div>

          {/* Bottom: Footer Links */}
          <div className="relative z-10 flex items-center gap-3 text-xs text-white/40 font-medium">
            <span>Powered by Groven</span>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <a href={rootUrl('/login')} className="text-white/70 hover:text-white transition-colors">
              Provider sign in
            </a>
          </div>
        </div>

        {/* ─── RIGHT PANEL (FORM) ─── */}
        <div className="flex-1 flex flex-col justify-center relative md:bg-white">

          {/* Mobile Header (Hidden on Desktop) */}
          <div className="md:hidden pt-12 pb-6 px-6 sm:px-10 flex flex-col items-center text-center">
            <div className="flex flex-col items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
              <TenantAvatar
                name={workspaceName}
                logoUrl={tenant?.logo_url}
                size={64}
                className="bg-white border border-border/40 shadow-sm"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
                  Client Portal
                </span>
                <h1 className="text-2xl font-bold text-text-main tracking-tight mt-0.5">
                  {workspaceName}
                </h1>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="w-full max-w-[440px] mx-auto px-6 sm:px-10 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {tenantErr ? (
              <div className="text-center bg-white p-8 rounded-3xl border border-border/60 shadow-soft mt-8 md:mt-0">
                <div className="mx-auto w-16 h-16 bg-surface flex items-center justify-center rounded-2xl mb-6">
                  <AlertCircle size={32} className="text-text-dim" />
                </div>
                <h2 className="text-xl font-bold text-text-main mb-2">Workspace not found</h2>
                <p className="text-sm text-text-sub leading-relaxed">
                  This portal doesn't exist or has been deactivated by the provider.
                </p>
              </div>
            ) : (
              <div className="bg-white/85 backdrop-blur-md md:bg-transparent p-8 md:p-0 rounded-[32px] md:rounded-none shadow-[0_16px_40px_rgba(0,0,0,0.04)] md:shadow-none border border-white/60 md:border-none">

                {/* Headings */}
                <div className="mb-8 md:mb-10">
                  <h2 className="text-[24px] md:text-3xl font-bold text-text-main tracking-tight mb-2">
                    Welcome back
                  </h2>
                  <p className="text-xs md:text-sm text-text-sub font-medium leading-relaxed">
                    {tenant?.tagline || 'Sign in to access your workspace.'}
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-5">

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-bold text-text-sub uppercase tracking-wider mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      autoFocus
                      required
                      className="w-full h-12 rounded-xl border border-[#e8eae8] bg-white/50 focus:bg-white px-4 text-sm text-text-main placeholder:text-text-dim focus:outline-none transition-all shadow-sm"
                      style={{ '--tw-ring-color': accentSoft }}
                      onFocus={(e) => e.target.style.borderColor = accent}
                      onBlur={(e) => e.target.style.borderColor = ''}
                    />
                  </div>

                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-text-sub uppercase tracking-wider">
                        Password
                      </label>
                      <Link to="/forgot-password" style={{ color: accent }} className="text-xs font-semibold hover:opacity-80 transition-opacity">
                        Forgot password?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        required
                        className="w-full h-12 rounded-xl border border-[#e8eae8] bg-white/50 focus:bg-white px-4 pr-12 text-sm text-text-main placeholder:text-text-dim focus:outline-none transition-all shadow-sm"
                        style={{ '--tw-ring-color': accentSoft }}
                        onFocus={(e) => e.target.style.borderColor = accent}
                        onBlur={(e) => e.target.style.borderColor = ''}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-text-dim hover:text-text-main transition-colors rounded-lg"
                      >
                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {error && (
                    <div className="flex items-center gap-2 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-medium animate-in fade-in zoom-in-95 duration-200">
                      <AlertCircle size={16} className="shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      background: `linear-gradient(135deg, ${accent}, ${accentDark})`,
                      boxShadow: `0 8px 20px ${accentSoft}`
                    }}
                    className="w-full h-12 mt-2 rounded-xl text-white text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 disabled:pointer-events-none"
                  >
                    {loading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        Sign in to portal
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </form>

                {/* Mobile Footer Area (Hidden on Desktop) */}
                <div className="md:hidden mt-8 space-y-6 animate-in fade-in duration-700 delay-200">
                  <div className="h-px bg-[#border]/50 w-full" style={{ backgroundColor: 'rgba(0,0,0,0.08)' }} />

                  <div className="flex justify-center text-sm font-medium text-text-dim">
                    Are you a provider?&nbsp;
                    <a href={rootUrl('/login')} style={{ color: accent }} className="font-bold hover:opacity-80 transition-opacity">
                      Sign in here
                    </a>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs font-medium text-text-dim">
                    <span>Powered by</span>
                    <a href={rootUrl('/')} className="hover:opacity-80 transition-opacity">
                      <img src={groveLogoGreen} alt="Groven" className="h-[14px] w-auto opacity-80 grayscale" />
                    </a>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}