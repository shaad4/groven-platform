import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { appUrl } from '../utils/urls'
import { signupSchema, getPasswordStrength } from '../utils/validation'

import {
  Eye,
  EyeOff,
  Mail,
  UserRound,
  LockKeyhole,
  ArrowRight,
} from 'lucide-react'

import { authApi } from '../api/auth.api'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'

import Button from '../components/Button'
import VerifyEmailModal from '../components/VerifyEmailModal'

import AuthShell from '../components/layout/AuthShell'

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
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    mode: 'onChange',
  })

  const password = useWatch({ control, name: 'password', defaultValue: '' })
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
      <AuthShell eyebrow="Groven workspace" title="Clients and requests, together." description="Set up a workspace for requests, conversations, and file delivery.">
            {/* HEADER */}
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-ink">Get started</p>
              <h1 className="mt-5 text-[36px] font-medium leading-tight tracking-[-0.04em] text-text-main">
                Create your account
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-text-sub">
                Verify your email to set up your client workspace.
              </p>
            </div>

            {/* SERVER ERROR */}
            {serverError && (
              <div role="alert" className="mb-5 rounded-xl border border-status-danger-text/20 bg-status-danger-bg px-4 py-3 text-sm text-status-danger-text">
                {serverError}
              </div>
            )}

            {/* GOOGLE BUTTON */}
            <div className="mb-6">
              <button
                type="button"
                disabled={googleLoading || isSubmitting}
                onClick={() => googleLogin()}
                className="w-full h-12 rounded-xl border border-border bg-layout-card text-sm font-medium text-text-main hover:bg-surface transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-sm"
              >
                {googleLoading ? (
                  <svg
                    className="animate-spin h-4 w-4 text-text-dim"
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
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-text-dim">or sign up with email</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            </div>

            {/* FORM */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

              {/* FULL NAME */}
              <div>
                <label htmlFor="signup-full_name" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><UserRound size={14} />Full name</label>
                <input
                  type="text"
                  placeholder="Jordan Taylor"
                  id="signup-full_name"
                    autoComplete="name"
                    aria-invalid={!!errors.full_name}
                    aria-describedby={errors.full_name ? "signup-full_name-error" : undefined}
                    {...register('full_name')}
                  className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 text-sm text-text-main placeholder:text-text-dim outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                {errors.full_name && (
                  <p id="signup-full_name-error" className="mt-1.5 text-xs text-status-danger-text">{errors.full_name.message}</p>
                )}
              </div>

              {/* EMAIL */}
              <div>
                <label htmlFor="signup-email" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><Mail size={14} />Email address</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  id="signup-email"
                    autoComplete="email"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "signup-email-error" : undefined}
                    {...register('email')}
                  className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 text-sm text-text-main placeholder:text-text-dim outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                />
                {errors.email && (
                  <p id="signup-email-error" className="mt-1.5 text-xs text-status-danger-text">{errors.email.message}</p>
                )}
              </div>

              {/* PASSWORD */}
              <div>
                <label htmlFor="signup-password" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><LockKeyhole size={14} />Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create secure password"
                    id="signup-password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.password}
                    aria-describedby={errors.password ? "signup-password-error" : undefined}
                    {...register('password')}
                    className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 pr-12 text-sm text-text-main placeholder:text-text-dim outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-dim hover:text-text-main"
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
                            ? strength === 1 ? 'bg-status-danger-text'
                              : strength === 2 ? 'bg-yellow-500'
                              : strength === 3 ? 'bg-lime-500'
                              : 'bg-emerald-500'
                            : 'bg-border'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-xs">
                    <span className="text-text-dim">Password strength</span>
                    <span aria-live="polite" className={`font-medium ${
                      !password ? 'text-text-dim' : strength <= 1 ? 'text-status-danger-text'
                        : strength === 2 ? 'text-status-review-text'
                        : strength === 3 ? 'text-primary-ink'
                        : 'text-primary-ink'
                    }`}>
                      {!password ? 'Use 8+ characters' : strength <= 1 ? 'Weak' : strength === 2 ? 'Medium' : strength === 3 ? 'Strong' : 'Very strong'}
                    </span>
                  </div>
                </div>

                {errors.password && (
                  <p id="signup-password-error" className="mt-1.5 text-xs text-status-danger-text">{errors.password.message}</p>
                )}
              </div>

              {/* CONFIRM PASSWORD */}
              <div>
                <label htmlFor="signup-confirm_password" className="mb-2 flex items-center gap-2 text-xs font-semibold text-text-sub"><LockKeyhole size={14} />Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    id="signup-confirm_password"
                    autoComplete="new-password"
                    aria-invalid={!!errors.confirm_password}
                    aria-describedby={errors.confirm_password ? "signup-confirm_password-error" : undefined}
                    {...register('confirm_password')}
                    className="h-12 w-full rounded-xl border border-border bg-layout-card px-4 pr-12 text-sm text-text-main placeholder:text-text-dim outline-none transition-all focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    aria-pressed={showConfirmPassword}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-lg text-text-dim hover:text-text-main"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p id="signup-confirm_password-error" className="mt-1.5 text-xs text-status-danger-text">{errors.confirm_password.message}</p>
                )}
              </div>

              {/* SUBMIT */}
              <Button
                type="submit"
                loading={isSubmitting}
                disabled={googleLoading}
                className="mt-2 h-12 w-full rounded-2xl bg-primary text-on-primary transition-all hover:bg-primary-dark"
              >
                <div className="flex items-center justify-center gap-2">
                  Create account
                  <ArrowRight size={16} />
                </div>
              </Button>

              {/* FOOTER LINK */}
              <p className="pt-2 text-center text-sm text-text-sub">
                Already have an account?{' '}
                <Link to="/login" className="font-medium text-primary-ink hover:underline">
                  Sign in
                </Link>
              </p>

            </form>

      </AuthShell>
      <VerifyEmailModal open={verifyModalOpen} email={signupEmail} onClose={() => setVerifyModalOpen(false)} />
    </>
  )
}
