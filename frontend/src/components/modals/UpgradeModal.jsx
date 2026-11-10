import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useSelector, useDispatch } from 'react-redux'
import { X, Check, Loader2, Sparkles } from 'lucide-react'
import { getPlanPricing } from '../../api/plans.api'

import {
  selectIsUpgradeModalOpen,
  selectUpgradeReason,
  selectUpgradeMessage,
  closeUpgradeModal,
} from '../../features/billing/billingSlice'
import { createCheckoutSession } from '../../api/billing.api'

const REASON_COPY = {
  limit_reached: {
    eyebrow: 'Plan limit reached',
    headline: "You've hit your Free plan limit",
  },
  pro_feature_required: {
    eyebrow: 'Pro feature',
    headline: 'This feature is part of Groven Pro',
  },
}

const PRO_FEATURES = [
  'Unlimited clients',
  'Unlimited active requests',
  'AI request summaries & categorisation',
  'AI reply & delivery message suggestions',
  'Priority support',
]

function PlanCard({ name, price, features, highlighted, cta, onCta, loading }) {
  return (
    <div
      className={`flex-1 rounded-2xl border p-5 flex flex-col ${
        highlighted
          ? 'border-[#0F6E56] bg-[#F0FAF5] shadow-sm'
          : 'border-[#E8EAE8] bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[13px] font-semibold text-[#141A14]">{name}</p>
        {highlighted && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0F6E56] bg-white px-2 py-0.5 rounded-full border border-[#B3DDD1]">
            <Sparkles size={10} /> Recommended
          </span>
        )}
      </div>
      <p className="text-[22px] font-semibold text-[#141A14] mb-3">{price}</p>
      <ul className="space-y-2 mb-5 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12px] text-[#4A544A]">
            <Check size={13} className="text-[#0F6E56] mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      {cta && (
        <button
          type="button"
          onClick={onCta}
          disabled={loading}
          className={`w-full h-9 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 ${
            highlighted
              ? 'bg-[#0F6E56] text-white hover:bg-[#0A5A44]'
              : 'bg-transparent text-[#4A544A] border border-[#E0E4E0] hover:bg-[#F2F4F2]'
          }`}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : cta}
        </button>
      )}
    </div>
  )
}

function UpgradeModalInner({ reason, message, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pricing, setPricing] = useState({ free: {}, pro: {} })
  const copy = REASON_COPY[reason] || REASON_COPY.limit_reached

  useEffect(() => {
    getPlanPricing().then(res => setPricing(res.data.data)).catch(() => {})
  }, [])

  const handleUpgrade = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await createCheckoutSession({
        successUrl: `${window.location.origin}/dashboard?upgraded=true`,
        cancelUrl: window.location.href,
      })
      window.location.href = res.data.data.checkout_url
    } catch {
      setError('Could not start checkout. Try again in a moment.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      <div
        className="relative bg-white w-full max-w-lg rounded-2xl border border-[#E8EAE8] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-1">
          <div>
            <p className="text-[11px] font-medium text-[#0F6E56] uppercase tracking-wide mb-1">
              {copy.eyebrow}
            </p>
            <h2 className="text-[17px] font-semibold text-[#141A14]">{copy.headline}</h2>
            {message && (
              <p className="text-[12px] text-[#9EA89E] mt-1 max-w-sm">{message}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg text-[#9EA89E] hover:text-[#4A544A] hover:bg-[#F2F4F2] transition-colors flex-shrink-0"
          >
            <X size={15} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-4 flex gap-3">
          <PlanCard
            name="Free"
            price={`$${Number(pricing.free.price_monthly ?? 0)}/mo`}
            features={[`${pricing.free.client_limit ?? 3} clients`, `${pricing.free.request_limit ?? 10} active requests`, 'Core request pipeline']}
          />
          <PlanCard
            name="Pro"
            price={`$${Number(pricing.pro.price_monthly ?? 0)}/mo`}
            features={PRO_FEATURES}
            highlighted
            cta="Upgrade to Pro"
            onCta={handleUpgrade}
            loading={loading}
          />
        </div>

        {error && (
          <div className="px-6 pb-5 -mt-2">
            <p className="text-[12px] text-red-600">{error}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default function UpgradeModal() {
  const dispatch = useDispatch()
  const isOpen = useSelector(selectIsUpgradeModalOpen)
  const reason = useSelector(selectUpgradeReason)
  const message = useSelector(selectUpgradeMessage)

  if (!isOpen) return null

  return createPortal(
    <UpgradeModalInner
      reason={reason}
      message={message}
      onClose={() => dispatch(closeUpgradeModal())}
    />,
    document.body
  )
}

