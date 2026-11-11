import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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

import Button from '../components/Button'
import VerifyEmailModal from '../components/VerifyEmailModal'

import AuthShell from '../components/layout/AuthShell'

// Validation schema and getPasswordStrength helper are imported from ../utils/validation

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [verifyModalOpen, setVerifyModalOpen] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')

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
