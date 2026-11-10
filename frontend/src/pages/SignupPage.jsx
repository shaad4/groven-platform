import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { appUrl } from '../utils/urls'
import { signupSchema, getPasswordStrength } from '../utils/validation'

import {
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  Users,
  Globe,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

import { authApi } from '../api/auth.api'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

import Button from '../components/Button'
import VerifyEmailModal from '../components/VerifyEmailModal'

import groveLogo from '../assets/Grove_transparent_logo(Green).png'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.20455C17.64 8.56636 17.5827 7.95273 17.4764 7.36364H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20455Z" fill="#4285F4"/>
      <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853"/>
      <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
      <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
    </svg>
  )
}

// Validation schema and getPasswordStrength helper are imported from ../utils/validation

export default function SignupPage() {
  const { saveSession } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [googleLoading, setGoogleLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  })

  const password = watch('password', '')
  const strength = getPasswordStrength(password)

  // Same hook pattern as LoginPage — triggers a popup, returns access_token
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setServerError('')
      setGoogleLoading(true)
      try {
        const { data } = await authApi.googleAuth(tokenResponse.access_token)

        saveSession({
          accessToken: data.access,
          user: data.user,
          tenant: data.tenant,
        })

        if (data.needs_workspace) {
          window.location.replace(
            appUrl(null, '/setup-workspace')
          )
        } else {
          const slug = data.tenant?.slug
          window.location.replace(
            appUrl(slug, '/dashboard')
          )
        }
      } catch (err) {
        const msg =
          err.response?.data?.error?.message ||
          err.response?.data?.message ||
          'Google sign-up failed. Please try again.'
        setServerError(msg)
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: (err) => {
      console.error('Google OAuth error:', err)
      setServerError('Google sign-up failed. Please try again.')
    },
    flow: 'implicit',
  })

  const onSubmit = async (data) => {
    setServerError('')
    try {
      const payload = {
        display_name: data.full_name,
        email: data.email,
        password: data.password,
      }
      await authApi.signup(payload)
      setSignupEmail(payload.email)
      setVerifyModalOpen(true)
    } catch (err) {
      const errorData = err.response?.data
      if (errorData?.email?.[0]) { setServerError(errorData.email[0]); return }
      if (errorData?.display_name?.[0]) { setServerError(errorData.display_name[0]); return }
      if (errorData?.password?.[0]) { setServerError(errorData.password[0]); return }
      if (errorData?.error?.message) { setServerError(errorData.error.message); return }
      if (errorData?.message) { setServerError(errorData.message); return }
      setServerError('Something went wrong')
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#f7f8f6] flex overflow-hidden">

        {/* LEFT */}
        <div className="w-full lg:w-[52%] flex items-center justify-center px-6 py-12 lg:px-12">
          <div className="w-full max-w-[460px]">

            {/* LOGO */}
            <div className="mb-10">
              <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
                <img src={groveLogo} alt="Groven" className="h-8 w-auto object-contain" />
              </a>
            </div>

            {/* HEADER */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dce7e1] bg-white px-3 py-1.5 text-xs font-medium text-[#0f7b5f] shadow-sm">
                <Sparkles size={14} />
                AI powered client workspace
              </div>
              <h1 className="mt-5 text-[42px] font-semibold leading-[1.05] tracking-tight text-[#17352c]">
                Create your Groven account
              </h1>
              <p className="mt-4 text-[16px] leading-relaxed text-[#74837d]">
                Verify your email and launch your private workspace in minutes.
              </p>
            </div>

            {/* SERVER ERROR */}
            {serverError && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-500">
                {serverError}
              </div>
            )}

            {/* GOOGLE BUTTON */}
            <div className="mb-6">
              <button
                type="button"
                disabled={googleLoading || isSubmitting}
                onClick={() => googleLogin()}
                className="w-full h-12 rounded-2xl border border-[#dce3df] bg-white text-sm font-medium text-[#17352c] hover:bg-[#f4f7f5] transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm"
              >
                {googleLoading ? (
                  <svg
                    className="animate-spin h-4 w-4 text-[#9aa6a1]"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <GoogleIcon />
                )}
                <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
              </button>

              {/* DIVIDER */}
              <div className="flex items-center gap-4 mt-5">
                <div className="h-px flex-1 bg-[#dce3df]" />
                <span className="text-xs text-[#9aa6a1]">or sign up with email</span>
                <div className="h-px flex-1 bg-[#dce3df]" />
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

              {/* FULL NAME */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17352c]">
                  Full name
                </label>
                <input
                  type="text"
                  placeholder="Arjun Kumar"
                  {...register('full_name')}
                  className="h-12 w-full rounded-2xl border border-[#dce3df] bg-white px-4 text-sm text-[#17352c] placeholder:text-[#9aa6a1] outline-none transition-all focus:border-[#0f7b5f] focus:ring-4 focus:ring-[#0f7b5f]/10"
                />
                {errors.full_name && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.full_name.message}</p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17352c]">
                  Email address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  className="h-12 w-full rounded-2xl border border-[#dce3df] bg-white px-4 text-sm text-[#17352c] placeholder:text-[#9aa6a1] outline-none transition-all focus:border-[#0f7b5f] focus:ring-4 focus:ring-[#0f7b5f]/10"
                />
                {errors.email && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17352c]">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create secure password"
                    {...register('password')}
                    className="h-12 w-full rounded-2xl border border-[#dce3df] bg-white px-4 pr-12 text-sm text-[#17352c] placeholder:text-[#9aa6a1] outline-none transition-all focus:border-[#0f7b5f] focus:ring-4 focus:ring-[#0f7b5f]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#97a39e]"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* STRENGTH */}
                <div className="mt-3">
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          strength >= level
                            ? strength === 1 ? 'bg-red-500'
                              : strength === 2 ? 'bg-yellow-500'
                              : strength === 3 ? 'bg-lime-500'
                              : 'bg-emerald-500'
                            : 'bg-[#dce3df]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-[#98a39f]">Password strength</span>
                    <span className={`font-medium ${
                      strength <= 1 ? 'text-red-500'
                        : strength === 2 ? 'text-yellow-500'
                        : strength === 3 ? 'text-lime-600'
                        : 'text-emerald-600'
                    }`}>
                      {strength <= 1 ? 'Weak' : strength === 2 ? 'Medium' : strength === 3 ? 'Strong' : 'Very Strong'}
                    </span>
                  </div>
                </div>

                {errors.password && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label className="mb-2 block text-sm font-medium text-[#17352c]">
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    {...register('confirm_password')}
                    className="h-12 w-full rounded-2xl border border-[#dce3df] bg-white px-4 pr-12 text-sm text-[#17352c] placeholder:text-[#9aa6a1] outline-none transition-all focus:border-[#0f7b5f] focus:ring-4 focus:ring-[#0f7b5f]/10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#97a39e]"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="mt-1.5 text-sm text-red-500">{errors.confirm_password.message}</p>
                )}
              </div>

              {/* SUBMIT */}
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={googleLoading}
                className="mt-2 h-12 w-full rounded-2xl bg-[#0f7b5f] text-white transition-all hover:bg-[#0c6d54]"
              >
                <div className="flex items-center justify-center gap-2">
                  Create account
                  <ArrowRight size={16} />
                </div>
              </Button>

              {/* FOOTER LINK */}
              <p className="pt-2 text-center text-sm text-[#8d9893]">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-[#0f7b5f] hover:underline">
                  Sign in
                </Link>
              </p>

            </form>
          </div>
        </div>

        {/* RIGHT */}
        <div className="hidden lg:flex relative w-[48%] border-l border-[#e5ebe7] bg-[#f4f7f5] overflow-hidden items-center justify-center px-14">

          <div className="absolute top-[-140px] right-[-120px] h-[300px] w-[300px] rounded-full bg-[#0f7b5f]/8 blur-3xl" />
          <div className="absolute bottom-[-120px] left-[-100px] h-[260px] w-[260px] rounded-full bg-[#17a56b]/10 blur-3xl" />

          <div className="relative z-10 w-full max-w-[430px]">

            <p className="mb-8 text-xs font-semibold uppercase tracking-[0.24em] text-[#98a49f]">
              What you get with Groven
            </p>

            <div className="space-y-7">

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f4ee]">
                  <Globe size={20} className="text-[#0f7b5f]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#17352c]">Your own subdomain</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#73827d]">
                    Launch instantly with your own private client workspace.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f4ee]">
                  <Users size={20} className="text-[#0f7b5f]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#17352c]">Private client portals</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#73827d]">
                    Every client gets secure requests, files and approvals.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e5f4ee]">
                  <ShieldCheck size={20} className="text-[#0f7b5f]" />
                </div>
                <div>
                  <h3 className="text-[18px] font-semibold text-[#17352c]">AI workflow automation</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#73827d]">
                    Automate onboarding, approvals and communication.
                  </p>
                </div>
              </div>

            </div>

            {/* MOCK CARD */}
            <div className="mt-12 rounded-[32px] border border-[#dfe8e3] bg-white/90 p-5 shadow-[0_20px_60px_rgba(15,123,95,0.08)] backdrop-blur">

              <div className="mb-5 flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
                <div className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
                <div className="ml-4 flex-1 rounded-full bg-[#f4f7f5] px-4 py-1 text-center text-[11px] text-[#97a39e]">
                  groven.in/arjundev
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex w-[62px] flex-col items-center rounded-3xl bg-[#0f7b5f] py-4">
                  <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                    <Sparkles size={18} className="text-white" />
                  </div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map((item) => (
                      <div key={item} className="h-9 w-9 rounded-xl bg-white/10" />
                    ))}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="h-3 w-24 rounded-full bg-[#dfe8e3]" />
                      <div className="mt-2 h-2 w-16 rounded-full bg-[#edf2ef]" />
                    </div>
                    <div className="rounded-xl bg-[#0f7b5f] px-3 py-2 text-xs font-medium text-white">
                      + New Client
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      ['#b9d7ff', 'Active'],
                      ['#ffd8a8', 'In Review'],
                      ['#d7c8ff', 'Pending'],
                    ].map(([color, status]) => (
                      <div
                        key={status}
                        className="flex items-center justify-between rounded-2xl bg-[#f7f9f8] px-3 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full" style={{ backgroundColor: color }} />
                          <div>
                            <div className="h-2.5 w-24 rounded-full bg-[#dfe8e3]" />
                            <div className="mt-2 h-2 w-14 rounded-full bg-[#edf2ef]" />
                          </div>
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#7b8883] shadow-sm">
                          {status}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-[#edf2ef] pt-4 text-[12px] text-[#8e9b95]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#17a56b]" />
                  Free forever plan
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-[#17a56b]" />
                  2 minute setup
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <VerifyEmailModal
        open={verifyModalOpen}
        email={signupEmail}
        onClose={() => setVerifyModalOpen(false)}
      />
    </>
  )
}