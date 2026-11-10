import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../api/auth.api'
import { getSubdomain } from '../utils/domain'

import groveLogo from "../assets/Grove_transparent_logo(Green).png";
import { appUrl } from "../utils/urls";


export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const subdomain = getSubdomain()
  const isClientPortal = !!subdomain

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isClientPortal) {
        await authApi.clientForgotPassword(email)
      } else {
        await authApi.forgotPassword(email)
      }

      setSent(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ───────────────────────────────────────────────────────────
  // STEP 2 — CHECK EMAIL
  // ───────────────────────────────────────────────────────────
  if (sent) {
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

          {/* Icon */}
          <div className="pt-10 flex flex-col items-center text-center">
            <div className="w-[72px] h-[72px] rounded-full bg-[#e8f0ee] flex items-center justify-center">
              <svg
                className="w-7 h-7 text-[#0f6e56]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
                <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
              </svg>
            </div>

            <h1 className="mt-5 text-[28px] leading-[34px] font-medium text-[#0a2e24]">
              Check your email
            </h1>

            <p className="mt-2 text-[15px] leading-[22px] text-[#9ea89e]">
              We've sent a password reset link to
            </p>

            <p className="text-[15px] leading-[22px] font-medium text-[#4a544a]">
              {email}
            </p>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-[#f7f8f7] border border-[#e8eae8] rounded-xl px-4 py-4">
            <p className="text-[13px] leading-5 text-[#9ea89e]">
              Didn't receive the email? Check your spam folder or{' '}
              <button
                onClick={() => setSent(false)}
                className="font-medium text-[#0f6e56] hover:underline"
              >
                Resend reset link
              </button>
            </p>
          </div>

          {/* Back */}
          <div className="pt-6 flex items-center justify-center gap-2 text-center">
            <svg
              className="w-[14px] h-[14px] text-[#9ea89e]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>

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

  // ───────────────────────────────────────────────────────────
  // STEP 1 — ENTER EMAIL
  // ───────────────────────────────────────────────────────────
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
            Forgot password?
          </h1>

          <p className="mt-1 text-[15px] leading-[22px] text-[#9ea89e] max-w-[320px]">
            Enter your email and we'll send you a reset link.
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
          className="pt-6"
        >
          <div>
            <label className="block text-[13px] font-medium text-[#4a544a] mb-1.5">
              Email address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full h-[48px] rounded-xl border border-[#e8eae8] px-4 text-[14px] text-[#141a14] placeholder:text-[#9ca3af] focus:outline-none focus:ring-2 focus:ring-[#0f6e56] focus:border-transparent transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full h-[48px] rounded-xl bg-[#0f6e56] hover:bg-[#0c5c48] text-white text-[15px] font-medium transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send reset link'}
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

