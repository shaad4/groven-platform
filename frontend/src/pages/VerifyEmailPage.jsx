import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom'

import {
  Loader2,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldCheck,
} from 'lucide-react'

import { authApi } from '../api/auth.api'
import { useAuth } from '../context/AuthContext'

import groveLogo from '../assets/Grove_transparent_logo(Green).png'
import { appUrl } from '../utils/urls'

export default function VerifyEmailPage() {

  const [params] =
    useSearchParams()

  const navigate =
    useNavigate()

  const { saveSession } =
    useAuth()

  const [status, setStatus] =
    useState('verifying')

  useEffect(() => {

    let ignore = false

    const verify = async () => {

      try {

        const token =
          params.get('token')

        console.log(
          'TOKEN:',
          token
        )

        if (!token) {

          setStatus('error')
          return
        }

        const res =
          await authApi.verifyEmail(token)

        if (ignore) return

        console.log(res.data)

        const payload =
          res.data.data

        saveSession({
          accessToken:
            payload.access,

          user:
            payload.user,

          tenant:
            null,
        })

        setStatus('success')

        setTimeout(() => {

          window.location.replace(
            appUrl(null, '/setup-workspace')
          )

        }, 1200)

      } catch (err) {

        console.log(
          err.response?.data
        )

        const errorData =
          err.response?.data

        const message =
          errorData?.message ||
          errorData?.error?.message ||
          errorData?.detail ||
          ''

        // IMPORTANT:
        // already-used token
        // still means verified

        if (
          message
            .toLowerCase()
            .includes('already') ||

          message
            .toLowerCase()
            .includes('used') ||

          message
            .toLowerCase()
            .includes('verified')
        ) {

          setStatus('success')

          setTimeout(() => {

            window.location.replace(
              appUrl(null, '/setup-workspace')
            )

          }, 1200)

          return
        }

        setStatus('error')
      }
    }

    verify()

    return () => {
      ignore = true
    }

  }, [])

  return (
    <div className="
      min-h-screen overflow-hidden
      bg-[#f7f8f6]
      flex items-center justify-center
      px-6
    ">

      {/* BACKGROUND BLURS */}
      <div className="
        absolute top-[-140px]
        right-[-140px]
        h-[320px] w-[320px]
        rounded-full
        bg-[#0f7b5f]/10
        blur-3xl
      " />

      <div className="
        absolute bottom-[-140px]
        left-[-140px]
        h-[320px] w-[320px]
        rounded-full
        bg-[#17a56b]/10
        blur-3xl
      " />

      {/* CARD */}
      <div
        className="
          relative z-10
          w-full max-w-[520px]
          rounded-[36px]
          border border-[#dfe8e3]
          bg-white/95
          p-10
          shadow-[0_20px_60px_rgba(15,123,95,0.08)]
          backdrop-blur
        "
      >

        {/* LOGO */}
        <div className="
          mb-10 flex justify-center
        ">
          <a href={appUrl(null, '/')} className="inline-block cursor-pointer outline-none">
            <img
              src={groveLogo}
              alt="Groven"
              className="h-8 w-auto"
            />
          </a>
        </div>

        {/* VERIFYING */}
        {status === 'verifying' && (
          <div className="text-center">

            <div className="
              mx-auto flex h-20 w-20
              items-center justify-center
              rounded-full bg-[#eef8f4]
            ">
              <Loader2
                size={34}
                className="
                  animate-spin
                  text-[#0f7b5f]
                "
              />
            </div>

            <h1 className="
              mt-8 text-[32px]
              font-semibold
              tracking-tight
              text-[#17352c]
            ">
              Verifying your email
            </h1>

            <p className="
              mt-3 text-[15px]
              leading-relaxed
              text-[#74837d]
            ">
              Please wait while we securely
              verify your Groven account.
            </p>

            <div className="
              mt-8 inline-flex
              items-center gap-2
              rounded-full
              border border-[#dce7e1]
              bg-[#f8fbf9]
              px-4 py-2
              text-xs font-medium
              text-[#0f7b5f]
            ">
              <ShieldCheck size={14} />
              Secure verification in progress
            </div>

          </div>
        )}

        {/* SUCCESS */}
        {status === 'success' && (
          <div className="text-center">

            <div className="
              mx-auto flex h-20 w-20
              items-center justify-center
              rounded-full bg-[#e9f8f1]
            ">
              <CheckCircle2
                size={40}
                className="
                  text-[#17a56b]
                "
              />
            </div>

            <h1 className="
              mt-8 text-[32px]
              font-semibold
              tracking-tight
              text-[#17352c]
            ">
              Email verified
            </h1>

            <p className="
              mt-3 text-[15px]
              leading-relaxed
              text-[#74837d]
            ">
              Your account has been
              successfully verified.
              Preparing your workspace setup.
            </p>

            <div className="
              mt-8 inline-flex
              items-center gap-2
              rounded-full
              border border-[#dce7e1]
              bg-[#f8fbf9]
              px-4 py-2
              text-xs font-medium
              text-[#0f7b5f]
            ">
              <Sparkles size={14} />
              Redirecting to workspace setup
            </div>

          </div>
        )}

        {/* ERROR */}
        {status === 'error' && (
          <div className="text-center">

            <div className="
              mx-auto flex h-20 w-20
              items-center justify-center
              rounded-full bg-red-50
            ">
              <XCircle
                size={40}
                className="text-red-500"
              />
            </div>

            <h1 className="
              mt-8 text-[32px]
              font-semibold
              tracking-tight
              text-[#17352c]
            ">
              Verification failed
            </h1>

            <p className="
              mt-3 text-[15px]
              leading-relaxed
              text-[#74837d]
            ">
              This verification link is invalid,
              expired or already used.
            </p>

            <button
              onClick={() =>
                navigate('/signup')
              }
              className="
                mt-8 h-12 rounded-2xl
                bg-[#0f7b5f]
                px-6 text-sm
                font-medium text-white
                transition-all
                hover:bg-[#0c6d54]
              "
            >
              Back to signup
            </button>

          </div>
        )}

      </div>
    </div>
  )
}