import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import groveLogo from '../assets/Grove_transparent_logo(Green).png'
import { getSubdomain } from '../utils/domain'
import { appUrl } from '../utils/urls'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [success, setSuccess] = useState(false)
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
      color: 'bg-[#0f6e56]',
      checks,
    }
  }

  const strength = getStrength(password)

  const ValidationItem = ({ valid, text }) => (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${
          valid ? 'bg-[#0f6e56]' : 'bg-[#d1d5db]'
        }`}
      />

      <span
        className={`text-[12px] ${
          valid ? 'text-[#0f6e56]' : 'text-[#9ca3af]'
        }`}
      >
        {text}
      </span>
    </div>
  )

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

  // ─────────────────────────────────────────────────────────
  // SUCCESS SCREEN
  // ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div className="min-h-screen bg-[#f6f7f6] flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[520px] bg-white border border-[#e8eae8] rounded-[24px] shadow-[0px_8px_20px_rgba(0,0,0,0.07)] p-11">

          {/* Logo */}
          <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
            <img
              src={groveLogo}
              alt="Groven"
              className="h-8 w-auto"
            />
          </a>

          {/* Success Icon */}
          <div className="pt-10 flex flex-col items-center text-center">
            <div className="w-[72px] h-[72px] rounded-full bg-[#0f6e56] flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>

            <h1 className="mt-5 text-[28px] leading-[34px] font-medium text-[#0a2e24]">
              Password reset!
            </h1>

            <p className="mt-2 max-w-[320px] text-[15px] leading-[22px] text-[#9ea89e]">
              Your password has been successfully reset.
              You can now sign in with your new password.
            </p>
          </div>

          <Link
            to={isClientPortal ? "/client-login" : "/login"}
            className="mt-8 flex items-center justify-center w-full h-[48px] rounded-xl bg-[#0f6e56] hover:bg-[#0c5c48] text-white text-[15px] font-medium transition"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────
  // RESET PASSWORD SCREEN
  // ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f6f7f6] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[520px] bg-white border border-[#e8eae8] rounded-[24px] shadow-[0px_8px_20px_rgba(0,0,0,0.07)] p-11">

        {/* Logo */}
        <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
          <img
            src={groveLogo}
            alt="Groven"
            className="h-8 w-auto"
          />
        </a>

        {/* Heading */}
        <div className="pt-10">
          <h1 className="text-[28px] leading-[34px] font-medium text-[#0a2e24]">
            Set new password
          </h1>

          <p className="mt-1 max-w-[360px] text-[15px] leading-[22px] text-[#9ea89e]">
            Your new password must be different from previously used passwords.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="pt-6 space-y-5"
        >

          {/* Password */}
          <div>
            <label className="block text-[13px] font-medium text-[#4a544a] mb-1.5">
              New password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              autoComplete="new-password"
              required
              autoFocus
              className="w-full h-[48px] rounded-xl border border-[#e8eae8] px-4 text-[14px] text-[#141a14] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0f6e56] focus:border-transparent transition"
            />

            {/* Strength UI */}
            {password && (
              <div className="mt-3">

                {/* Bar */}
                <div className="h-1.5 w-full bg-[#e8eae8] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${strength.color}`}
                    style={{ width: strength.width }}
                  />
                </div>

                {/* Strength Label */}
                <p className="mt-2 text-[12px] font-medium text-[#4a544a]">
                  Password strength: {strength.label}
                </p>

                {/* Validation Rules */}
                <div className="mt-3 space-y-1.5">

                  <ValidationItem
                    valid={strength.checks.length}
                    text="At least 8 characters"
                  />

                  <ValidationItem
                    valid={strength.checks.uppercase}
                    text="One uppercase letter"
                  />

                  <ValidationItem
                    valid={strength.checks.lowercase}
                    text="One lowercase letter"
                  />

                  <ValidationItem
                    valid={strength.checks.number}
                    text="One number"
                  />

                  <ValidationItem
                    valid={strength.checks.special}
                    text="One special character"
                  />

                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-[13px] font-medium text-[#4a544a] mb-1.5">
              Confirm password
            </label>

            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              required
              className="w-full h-[48px] rounded-xl border border-[#e8eae8] px-4 text-[14px] text-[#141a14] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0f6e56] focus:border-transparent transition"
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[48px] rounded-xl bg-[#0f6e56] hover:bg-[#0c5c48] text-white text-[15px] font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Resetting...' : 'Reset password'}
          </button>
        </form>

        {/* Footer */}
        <div className="pt-5 text-center">
          <p className="text-[13px] text-[#9ea89e]">
            Remember your password?{' '}
            <Link
              to={isClientPortal ? "/client-login" : "/login"}
              className="font-medium text-[#0f6e56] hover:underline"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}