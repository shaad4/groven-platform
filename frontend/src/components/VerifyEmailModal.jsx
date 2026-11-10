import { X, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useDialogFocus } from '../hooks/useDialogFocus'

export default function VerifyEmailModal({
  open,
  email,
  onClose,
}) {
  const dialogRef = useDialogFocus(open, onClose)
  if (!open) return null

  const openEmailApp = () => {
    window.location.href = 'mailto:'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm">

      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Verify your email" tabIndex={-1} className="relative max-h-[calc(100dvh-2rem)] overflow-y-auto w-full max-w-[430px] rounded-[32px] bg-layout-card p-8 shadow-2xl">

        {/* CLOSE */}
        <button
          aria-label="Close verification dialog"
          onClick={onClose}
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-xl text-text-dim hover:bg-surface"
        >
          <X size={18} />
        </button>

        {/* ICON */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-light">
          <CheckCircle2
            size={32}
            className="text-primary-ink"
          />
        </div>

        {/* TITLE */}
        <h2 className="mt-6 text-center text-[28px] font-semibold text-text-main">
          Verify your email
        </h2>

        <p className="mt-3 text-center text-[15px] leading-relaxed text-text-sub">
          We’ve sent a verification link to
        </p>

        <p className="mt-2 break-words text-center text-[15px] font-semibold text-text-main">
          {email}
        </p>

        <p className="mt-5 text-center text-[14px] leading-relaxed text-text-dim">
          Please click the link in the email to continue
          setting up your workspace.
        </p>

        {/* BUTTONS */}
        <div className="mt-8 flex gap-3">

          <button
            onClick={onClose}
            className="
              h-12 flex-1 rounded-2xl border border-border
              bg-surface text-sm font-medium text-text-main
            "
          >
            Change email
          </button>

          <button
            onClick={openEmailApp}
            className="
              h-12 flex-1 rounded-2xl
              bg-primary text-sm font-medium text-white
            "
          >
            Open email app
          </button>

        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-text-dim hover:text-text-main"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}