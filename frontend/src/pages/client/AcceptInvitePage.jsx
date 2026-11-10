import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  ArrowRight, Check, Eye, EyeOff,
  Lock, MessageCircle, TrendingUp, Upload, AlertTriangle,
} from 'lucide-react'
import groveLogo from '../../assets/Grove_transparent_logo(White).png'
import { authApi as clientApi } from '../../api/auth.api'
import { useAuth } from '../../context/AuthContext'
import { appUrl } from '../../utils/urls'

// ─── HELPERS ──────────────────────────────────────────────────

function getStrength(pw) {
  if (!pw) return { score: 0, label: '', color: '' }
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  const levels = [
    { label: '', color: '' },
    { label: 'Weak', color: 'bg-red-400' },
    { label: 'Fair', color: 'bg-yellow-400' },
    { label: 'Good', color: 'bg-[#1d9e75]' },
    { label: 'Strong', color: 'bg-[#0f6e56]' },
  ]
  return { score: s, ...levels[s] }
}


// ─── SUB-COMPONENTS ───────────────────────────────────────────

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1d9e75] text-white shrink-0">
        {icon}
      </div>
      <div>
        <h3 className="text-[14px] font-medium text-white">{title}</h3>
        <p className="mt-1 text-[12px] leading-5 text-[#b3e0d1]">{desc}</p>
      </div>
    </div>
  )
}

function Divider() {
  return <div className="my-5 h-px w-full bg-white/10" />
}

// ─── PAGE ─────────────────────────────────────────────────────

export default function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { saveSession } = useAuth()

  // Token validation
  const [validating, setValidating] = useState(true)
  const [tokenError, setTokenError] = useState('')
  const [inviteData, setInviteData] = useState(null)
  // inviteData shape:
  //   { client_name, client_email, provider_name, workspace_name,
  //     tenant_slug, already_has_account }

  // Form
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [done, setDone] = useState(false)

  const strength = getStrength(password)
  const pwMatch = confirm && password === confirm

  // ── Validate token on mount ──────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenError('No invite token found. Check your email link.')
      setValidating(false)
      return
    }

    clientApi.validateInviteToken(token)
      .then(res => setInviteData(res.data.data))
      .catch(err => setTokenError(
        err?.response?.data?.message ||
        'This invite link is invalid or has expired.'
      ))
      .finally(() => setValidating(false))
  }, [token])

  // ── Submit ───────────────────────────────────────────────
  const handleSubmit = async () => {
    setSubmitError('')

    // Only validate password fields for new accounts
    if (!inviteData?.already_has_account) {
      if (password.length < 8) {
        setSubmitError('Password must be at least 8 characters.')
        return
      }
      if (password !== confirm) {
        setSubmitError('Passwords do not match.')
        return
      }
    }

    setSubmitting(true)
    try {
      const payload = inviteData?.already_has_account
        ? { token }           // existing user — no password needed
        : { token, password } // new user — set password


      console.log('→ sending payload:', payload)
      const res = await clientApi.acceptInvite(payload)
      console.log('→ accept response:', res.data)

      const { access, user, tenant } = res.data.data
      console.log('→ user:', user)
      console.log('→ tenant:', tenant)


      saveSession({ accessToken: access, user, tenant })
      console.log('→ saveSession called')

      setDone(true)

      // Give the success screen a moment to render, then navigate.
      setTimeout(() => {
        const url = appUrl(tenant.slug, '/portal')
        console.log('→ redirecting to:', url)
        window.location.replace(url)
      }, 1500)

    } catch (err) {
      setSubmitError(
        err?.response?.data?.message ||
        'Something went wrong. Please try again.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const providerInitials = inviteData?.provider_name
    ? inviteData.provider_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '??'

  const isExistingUser = inviteData?.already_has_account

  // ── LOADING ──────────────────────────────────────────────
  if (validating) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6]">
      <div className="flex flex-col items-center gap-4">
        <svg className="h-8 w-8 animate-spin text-[#0f6e56]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-[14px] text-[#9ea89e]">Validating your invite…</p>
      </div>
    </div>
  )

  // ── TOKEN ERROR ──────────────────────────────────────────
  if (tokenError) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6] px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-[#e8eae8] bg-white p-10 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f5dfb0] bg-[#fef3e2] mx-auto">
          <AlertTriangle size={28} className="text-[#92500a]" />
        </div>
        <h1 className="mt-6 text-[22px] font-semibold text-[#0a2e24]">Invalid invite link</h1>
        <p className="mt-3 text-[14px] leading-7 text-[#9ea89e]">{tokenError}</p>
        <p className="mt-6 text-[13px] text-[#9ea89e]">
          Contact your provider to resend the invite.
        </p>
      </div>
    </div>
  )

  // ── SUCCESS ──────────────────────────────────────────────
  if (done) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6] px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-[#b3e0d1] bg-white p-10 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#b3e0d1] bg-[#e6f5f0] mx-auto">
          <Check size={30} className="text-[#0f6e56]" />
        </div>
        <h1 className="mt-6 text-[22px] font-semibold text-[#0a2e24]">You're all set!</h1>
        <p className="mt-3 text-[14px] leading-7 text-[#9ea89e]">
          Taking you to your portal…
        </p>
      </div>
    </div>
  )

  // ── MAIN FORM ────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white flex flex-col lg:flex-row">


      {/* LEFT PANEL */}
      <div className="relative hidden lg:flex w-[44%] overflow-hidden bg-[#031712]">

        {/* Background layers */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(29,158,117,0.28)_0%,rgba(15,110,86,0.16)_28%,rgba(3,23,18,1)_72%)]" />

        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.015),transparent)]" />

        {/* Glow */}
        <div className="absolute left-[-120px] top-[120px] h-[320px] w-[320px] rounded-full bg-[#1d9e75]/20 blur-[120px]" />

        <div className="absolute bottom-[-100px] right-[-80px] h-[260px] w-[260px] rounded-full bg-[#0f6e56]/20 blur-[100px]" />

        {/* Content */}
        <div className="relative z-10 flex min-h-screen w-full flex-col justify-between px-12 py-10">

          {/* Top */}
          <div className="flex w-full items-center justify-start">
            <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
              <img
                src={groveLogo}
                alt="Groven"
                className="h-8 w-auto object-contain opacity-95"
              />
            </a>
          </div>

          {/* Center */}
          <div className="mx-auto flex w-full max-w-[460px] flex-col items-center">

            {/* Provider identity */}
            <div className="relative">

              {/* Glow ring */}
              <div className="absolute inset-0 rounded-full bg-[#1d9e75]/30 blur-2xl" />

              {/* Avatar */}
              <div className="
                relative

                flex h-[88px] w-[88px]
                items-center justify-center

                rounded-[28px]

                border border-white/10

                bg-[linear-gradient(135deg,#1d9e75,#0f6e56)]

                text-[32px]
                font-semibold
                tracking-wide
                text-white

                shadow-[0_10px_40px_rgba(0,0,0,0.25)]
              ">
                {providerInitials}
              </div>
            </div>

            {/* Heading */}
            <div className="mt-8 text-center">
              <p className="
                text-[12px]
                font-medium
                uppercase
                tracking-[0.18em]
                text-[#7fd8ba]
              ">
                You've been invited
              </p>

              <h2 className="
                mt-4

                text-[42px]
                font-semibold

                tracking-[-1.6px]

                leading-[1.05]

                text-white
              ">
                {inviteData?.workspace_name}
              </h2>

              <p className="
                mt-5

                text-[17px]
                leading-8

                text-[#9fd6c3]
              ">
                Collaborate, submit requests, track progress,
                and communicate with your provider —
                all in one focused workspace.
              </p>
            </div>

            {/* Features */}
            <div className="
              mt-14

              w-full

              rounded-[28px]

              border border-white/10

              bg-white/[0.045]

              p-7

              shadow-[0_12px_40px_rgba(0,0,0,0.18)]

              backdrop-blur-xl
            ">

              {/* Feature */}
              <div className="flex items-start gap-4">
                <div className="
                  flex h-11 w-11 shrink-0 items-center justify-center

                  rounded-2xl

                  border border-white/10

                  bg-[#1d9e75]/20

                  text-[#baf3dd]
                ">
                  <Upload size={17} />
                </div>

                <div>
                  <h3 className="text-[15px] font-medium text-white">
                    Submit requests
                  </h3>

                  <p className="mt-1.5 text-[13px] leading-6 text-[#9fd6c3]">
                    Organize all project requests in one secure place.
                  </p>
                </div>
              </div>

              <div className="my-6 h-px w-full bg-white/10" />

              {/* Feature */}
              <div className="flex items-start gap-4">
                <div className="
                  flex h-11 w-11 shrink-0 items-center justify-center

                  rounded-2xl

                  border border-white/10

                  bg-[#1d9e75]/20

                  text-[#baf3dd]
                ">
                  <TrendingUp size={17} />
                </div>

                <div>
                  <h3 className="text-[15px] font-medium text-white">
                    Track progress
                  </h3>

                  <p className="mt-1.5 text-[13px] leading-6 text-[#9fd6c3]">
                    Follow updates, delivery stages, and approvals in real time.
                  </p>
                </div>
              </div>

              <div className="my-6 h-px w-full bg-white/10" />

              {/* Feature */}
              <div className="flex items-start gap-4">
                <div className="
                  flex h-11 w-11 shrink-0 items-center justify-center

                  rounded-2xl

                  border border-white/10

                  bg-[#1d9e75]/20

                  text-[#baf3dd]
                ">
                  <MessageCircle size={17} />
                </div>

                <div>
                  <h3 className="text-[15px] font-medium text-white">
                    Communicate clearly
                  </h3>

                  <p className="mt-1.5 text-[13px] leading-6 text-[#9fd6c3]">
                    Stay aligned with {inviteData?.provider_name} without scattered emails.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom */}
          <div className="
            flex items-center gap-2

            text-[12px]

            text-[#76bca6]
          ">
            <Lock size={12} />

            <span>
              Private workspace · Secure access · Powered by Groven
            </span>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="flex flex-1 items-center justify-center bg-[#f8f8f6] px-6 py-12 lg:px-10">
        <div className="w-full max-w-[450px]">

          {/* Heading — differs by account type */}
          <div>
            <h1 className="text-[36px] font-bold tracking-[-1px] text-[#141a14]">
              {isExistingUser
                ? `Welcome back, ${inviteData?.client_name?.split(' ')[0]}!`
                : `You're invited, ${inviteData?.client_name?.split(' ')[0]}!`}
            </h1>
            <p className="mt-2 text-[16px] leading-7 text-[#6b7a6b]">
              {isExistingUser
                ? 'Your existing Groven account will be connected to this portal.'
                : 'Set a password to access your private project portal.'}
            </p>
          </div>

          <div className="mt-10 space-y-6">

            {/* Email (always read-only) */}
            <div>
              <label className="mb-2 block text-[13px] font-medium text-[#141a14]">Email address</label>
              <div className="relative">
                <input
                  disabled
                  type="email"
                  value={inviteData?.client_email || ''}
                  className="h-[52px] w-full rounded-[12px] border border-[#e7ebe7] bg-[#f7f8f7] px-4 pr-11 text-[14px] text-[#9ea89e] outline-none"
                />
                <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a3aaa3]" />
              </div>
              <p className="mt-2 text-[12px] text-[#9ea89e]">
                {isExistingUser
                  ? 'This is your existing Groven account.'
                  : 'This cannot be changed.'}
              </p>
            </div>

            {/* Password fields — only for new users */}
            {!isExistingUser && (
              <>
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#141a14]">Create a password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Choose a secure password"
                      className="h-[54px] w-full rounded-[12px] border border-[#e8eae8] bg-white px-4 pr-12 text-[14px] outline-none transition-all focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9ea89e]"
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>

                  {password && (
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-[4px] flex-1 rounded-full transition-all ${i <= strength.score ? strength.color : 'bg-[#dfe3df]'
                              }`}
                          />
                        ))}
                        {strength.label && (
                          <span className={`ml-2 text-[11px] font-semibold ${strength.score >= 3 ? 'text-[#0f6e56]' : 'text-[#92500a]'
                            }`}>
                            {strength.label}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="mt-2 text-[12px] text-[#9ea89e]">Minimum 8 characters.</p>
                </div>

                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[#141a14]">Confirm password</label>
                  <div className="relative">
                    <input
                      type="password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Repeat your password"
                      className={`h-[54px] w-full rounded-[12px] border bg-white px-4 pr-12 text-[14px] outline-none transition-all ${confirm
                          ? pwMatch
                            ? 'border-[#1d9e75] ring-4 ring-[#1d9e75]/10'
                            : 'border-red-400 ring-4 ring-red-100'
                          : 'border-[#e8eae8] focus:border-[#0f6e56] focus:ring-4 focus:ring-[#0f6e56]/10'
                        }`}
                    />
                    {confirm && (
                      <span className="absolute right-4 top-1/2 -translate-y-1/2">
                        {pwMatch
                          ? <Check size={16} className="text-[#1d9e75]" />
                          : <span className="text-[11px] text-red-400 font-medium">✗</span>}
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Existing user — info card instead of password fields */}
            {isExistingUser && (
              <div className="rounded-[12px] border border-[#b3e0d1] bg-[#e6f5f0] px-5 py-4">
                <p className="text-[13px] leading-6 text-[#0f6e56]">
                  You already have a Groven account. Clicking below will add{' '}
                  <span className="font-semibold">{inviteData?.workspace_name}</span> to
                  your portals — no new password needed.
                </p>
              </div>
            )}
          </div>

          {/* Error */}
          {submitError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
              {submitError}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              // New users must fill both fields; existing users can proceed immediately
              (!isExistingUser && (!password || !confirm))
            }
            className="mt-8 flex h-[56px] w-full items-center justify-center gap-3 rounded-[12px] bg-[#0f6e56] text-[15px] font-semibold text-white transition-all hover:bg-[#0c5b47] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <>
                <ArrowRight size={16} />
                {isExistingUser ? 'Accept invite & enter portal' : 'Create account & enter portal'}
              </>
            )}
          </button>

          {/* Footer */}
          <div className="mt-7 flex items-center justify-center gap-2">

            <span className="text-[12px] text-[#9ea89e]">Powered by Groven</span>
          </div>
          <p className="mt-4 text-center text-[12px] text-[#9ea89e]">
            Wrong invite?{' '}
            <a href="mailto:support@groven.in" className="cursor-pointer text-[#0f6e56] underline">
              Contact support@groven.in
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}