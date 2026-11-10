import { X, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function VerifyEmailModal({
  open,
  email,
  onClose,
}) {
  if (!open) return null

  const openEmailApp = () => {
    window.location.href = 'mailto:'
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm">

      <div className="relative w-full max-w-[430px] rounded-[32px] bg-white p-8 shadow-2xl">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 text-[#a1aba6]"
        >
          <X size={18} />
        </button>

        {/* ICON */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#e8f7f0]">
          <CheckCircle2
            size={32}
            className="text-[#139360]"
          />
        </div>

        {/* TITLE */}
        <h2 className="mt-6 text-center text-[28px] font-semibold text-[#17352c]">
          Verify your email
        </h2>

        <p className="mt-3 text-center text-[15px] leading-relaxed text-[#7f8b86]">
          We’ve sent a verification link to
        </p>

        <p className="mt-2 text-center text-[15px] font-semibold text-[#17352c]">
          {email}
        </p>

        <p className="mt-5 text-center text-[14px] leading-relaxed text-[#97a29d]">
          Please click the link in the email to continue
          setting up your workspace.
        </p>

        {/* BUTTONS */}
        <div className="mt-8 flex gap-3">

          <button
            onClick={onClose}
            className="
              h-12 flex-1 rounded-2xl border border-[#dce3df]
              bg-[#f8faf9] text-sm font-medium text-[#17352c]
            "
          >
            Change email
          </button>

          <button
            onClick={openEmailApp}
            className="
              h-12 flex-1 rounded-2xl
              bg-[#0f7b5f] text-sm font-medium text-white
            "
          >
            Open email app
          </button>

        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-[#97a29d] hover:text-[#17352c]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}