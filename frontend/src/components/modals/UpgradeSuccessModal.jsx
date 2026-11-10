import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle2, X, Check } from 'lucide-react'

const PRO_UNLOCKS = [
  'Unlimited clients',
  'Unlimited active requests',
  'AI summaries, categorisation & reply suggestions',
]

function UpgradeSuccessModalInner({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative bg-layout-card w-full max-w-sm rounded-2xl border border-border shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 flex items-center justify-center w-7 h-7 rounded-lg text-text-dim hover:text-text-sub hover:bg-surface transition-colors"
        >
          <X size={15} />
        </button>

        <div className="px-6 pt-8 pb-6 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mb-4">
            <CheckCircle2 size={24} className="text-primary-ink" />
          </div>

          <h2 className="text-[17px] font-semibold text-text-main mb-1.5">
            Welcome to Groven Pro
          </h2>
          <p className="text-[13px] text-text-dim mb-5">
            Your upgrade is complete. Here's what's unlocked:
          </p>

          <ul className="space-y-2 text-left mb-6">
            {PRO_UNLOCKS.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] text-text-sub">
                <Check size={13} className="text-primary-ink mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 rounded-lg bg-primary text-white text-[13px] font-medium hover:bg-primary-dark transition-colors"
          >
            Get started
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UpgradeSuccessModal() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      setShow(true)
    }
  }, [searchParams])

  const handleClose = () => {
    setShow(false)
    const next = new URLSearchParams(searchParams)
    next.delete('upgraded')
    setSearchParams(next, { replace: true })
  }

  if (!show) return null

  return createPortal(<UpgradeSuccessModalInner onClose={handleClose} />, document.body)
}