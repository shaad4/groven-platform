import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Minus, Loader2, Sparkles,
  Users, Inbox, MessageSquare, Send, ShieldCheck, HelpCircle,
} from 'lucide-react'

import { getWorkspace } from '../../api/settings.api'
import { createCheckoutSession, getBillingPortalUrl } from '../../api/billing.api'
import { getPlanPricing } from '../../api/plans.api'
import { useAuth } from '../../context/AuthContext'

// ── Plan content ──────────────────────────────────────────────
const FREE_FEATURES = [
  'Up to 3 clients',
  'Up to 10 active requests',
  'Core request pipeline',
  'Live notifications & chat',
]

const PRO_FEATURES = [
  'Unlimited clients',
  'Unlimited active requests',
  'AI request summaries & categorisation',
  'AI reply & delivery message suggestions',
  'Priority support',
]

// What you unlock — feature grid below the plan cards
const UNLOCK_ITEMS = [
  { icon: Users,         label: 'Unlimited clients',                desc: 'Add as many clients as you take on. No caps, no waitlists.' },
  { icon: Inbox,         label: 'Unlimited active requests',         desc: 'Run every project at once without hitting a ceiling.' },
  { icon: Sparkles,      label: 'AI summaries & categorisation',     desc: 'Every request gets an instant AI summary and category tag.' },
  { icon: MessageSquare, label: 'AI reply suggestions',              desc: 'Draft client replies in one click from the chat panel.' },
  { icon: Send,          label: 'AI delivery messages',              desc: 'Generate a polished delivery note before you send files.' },
  { icon: ShieldCheck,   label: 'Priority support',                  desc: 'Jump the queue when you need help fast.' },
]

// Row-by-row breakdown for the comparison table
const FEATURE_ROWS = [
  { label: 'Clients',                              free: 'Up to 3',  pro: 'Unlimited' },
  { label: 'Active requests',                      free: 'Up to 10', pro: 'Unlimited' },
  { label: 'Core request pipeline',                 free: true,       pro: true },
  { label: 'Live notifications & chat',             free: true,       pro: true },
  { label: 'AI request summaries & categorisation',  free: false,      pro: true },
  { label: 'AI reply suggestions',                  free: false,      pro: true },
  { label: 'AI delivery message suggestions',        free: false,      pro: true },
  { label: 'Priority support',                      free: false,      pro: true },
]

const FAQ_ITEMS = [
  {
    q: 'Can I switch back to Free later?',
    a: 'Yes. Open Settings → Plan & billing any time and manage or cancel your subscription from the billing portal.',
  },
  {
    q: "What happens if I'm at my Free plan limit and don't upgrade?",
    a: "Nothing you've already created is affected — you just won't be able to add new clients or requests past your plan's limit until you upgrade or free up space.",
  },
  {
    q: 'How do I pay, and is it secure?',
    a: 'Checkout and billing are handled entirely by Stripe. Groven never sees or stores your card details.',
  },
]

// ── Plan card ─────────────────────────────────────────────────
function PlanCard({ name, price, period, features, highlighted, cta, onCta, loading, footnote }) {
  const inner = (
    <div className={`h-full rounded-2xl p-7 flex flex-col ${highlighted ? 'bg-[#FBFEFD]' : 'border border-[#E8EAE8] bg-white'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] font-semibold text-[#141A14]">{name}</p>
        {highlighted && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0F6E56] bg-white px-2.5 py-1 rounded-full border border-[#B3DDD1]">
            <Sparkles size={11} /> Recommended
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1 mb-5">
        <p className="text-[32px] font-semibold text-[#141A14]">{price}</p>
        {period && <p className="text-[13px] text-[#9EA89E]">{period}</p>}
      </div>

      <ul className="space-y-3 mb-7 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-[#4A544A]">
            <Check size={15} className="text-[#0F6E56] mt-0.5 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {cta && (
        <>
          <button
            type="button"
            onClick={onCta}
            disabled={loading}
            className={`w-full h-11 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2 ${
              highlighted
                ? 'bg-[#0F6E56] text-white hover:bg-[#0A5A44]'
                : 'bg-transparent text-[#4A544A] border border-[#E0E4E0] hover:bg-[#F2F4F2]'
            }`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : (
              <>{cta}{highlighted && <ArrowRight size={14} />}</>
            )}
          </button>
          {footnote && (
            <p className="text-[11px] text-[#9EA89E] text-center mt-2.5">{footnote}</p>
          )}
        </>
      )}
    </div>
  )

  if (!highlighted) {
    return <div className="flex-1">{inner}</div>
  }

  // Same violet → emerald gradient ring used as the "AI" signature elsewhere in the product
  return (
    <div className="flex-1 relative rounded-2xl bg-gradient-to-br from-violet-300/60 via-emerald-300/50 to-cyan-300/60 p-[1.5px] shadow-[0_12px_32px_rgba(15,110,86,0.14)]">
      {inner}
    </div>
  )
}

// ── Unlock grid ───────────────────────────────────────────────
function UnlockGrid() {
  return (
    <div className="mb-12">
      <h2 className="text-[16px] font-semibold text-[#141A14] mb-5 text-center">What you unlock on Pro</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UNLOCK_ITEMS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-2xl border border-[#E8EAE8] bg-white p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-emerald-500 mb-3">
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-[13px] font-semibold text-[#141A14] mb-1">{label}</p>
            <p className="text-[12px] text-[#9EA89E] leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────
function ComparisonCell({ value }) {
  if (value === true) return <Check size={15} className="text-[#0F6E56] mx-auto" />
  if (value === false) return <Minus size={14} className="text-[#C5CAC5] mx-auto" />
  return <span className="text-[13px] text-[#4A544A]">{value}</span>
}

function ComparisonTable() {
  return (
    <div className="mb-12">
      <h2 className="text-[16px] font-semibold text-[#141A14] mb-5 text-center">Compare plans in detail</h2>
      <div className="border border-[#E8EAE8] rounded-2xl overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#FAFBFA] text-[#9EA89E] text-left">
                <th className="font-medium px-5 py-3">Feature</th>
                <th className="font-medium px-5 py-3 text-center w-32">Free</th>
                <th className="font-medium px-5 py-3 text-center w-32 text-[#0F6E56]">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_ROWS.map((row) => (
                <tr key={row.label} className="border-t border-[#F0F2F0]">
                  <td className="px-5 py-3 text-[#141A14]">{row.label}</td>
                  <td className="px-5 py-3 text-center"><ComparisonCell value={row.free} /></td>
                  <td className="px-5 py-3 text-center bg-[#F0FAF5]"><ComparisonCell value={row.pro} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── FAQ ───────────────────────────────────────────────────────
function FaqSection() {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-center gap-1.5 mb-5">
        <HelpCircle size={15} className="text-[#9EA89E]" />
        <h2 className="text-[16px] font-semibold text-[#141A14]">Common questions</h2>
      </div>
      <div className="max-w-xl mx-auto divide-y divide-[#F0F2F0] border border-[#E8EAE8] rounded-2xl bg-white overflow-hidden">
        {FAQ_ITEMS.map((item) => (
          <div key={item.q} className="px-5 py-4">
            <p className="text-[13px] font-medium text-[#141A14] mb-1">{item.q}</p>
            <p className="text-[12px] text-[#9EA89E] leading-relaxed">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function UpgradePage() {
  const navigate = useNavigate()

  const [planLoading, setPlanLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pricing, setPricing] = useState({ free: {}, pro: {} })

  const freeFeatures = [
    `Up to ${pricing.free.client_limit} clients`,
    `Up to ${pricing.free.request_limit} active requests`,
    'Core request pipeline',
    'Live notifications & chat',
  ]


  const { tenant, isAuth } = useAuth()

  useEffect(() => {
    getPlanPricing()
      .then((res) => {
        setPricing(res.data.data)

        if (isAuth) {
          setIsPro(
            tenant?.is_pro ?? false
          )
        }
      })
      .finally(() => setPlanLoading(false))
  }, [tenant, isAuth])

  const handleUpgrade = async () => {
    setCheckoutLoading(true)
    setError(null)
    try {
      const res = await createCheckoutSession({
        successUrl: `${window.location.origin}/dashboard?upgraded=true`,
        cancelUrl: window.location.href,
      })
      window.location.href = res.data.data.checkout_url
    } catch {
      setError('Could not start checkout. Try again in a moment.')
      setCheckoutLoading(false)
    }
  }

  const handleManageBilling = async () => {
    setPortalLoading(true)
    setError(null)
    try {
      const res = await getBillingPortalUrl({ returnUrl: window.location.href })
      window.location.href = res.data.data.portal_url
    } catch {
      setError('Could not open the billing portal. Try again in a moment.')
      setPortalLoading(false)
    }
  }

  // ── Loading guard ──
  if (planLoading || !pricing.pro ) {
    return (
      <div className="min-h-screen bg-[#F7F8F7] flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-[#0F6E56]" />
      </div>
    )
  }

  // ── Already on Pro — don't show an upgrade pitch, show account status instead ──
  if (isPro) {
    return (
      <div className="min-h-screen bg-[#F7F8F7] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-emerald-500 shadow-[0_0_20px_rgba(99,102,241,0.25)]">
            <Sparkles size={22} className="text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#141A14] mb-2">You're already on Groven Pro</h1>
          <p className="text-[14px] text-[#6B756B] mb-7 leading-relaxed">
            Unlimited clients, unlimited requests, and every AI feature are unlocked on your workspace.
          </p>
          {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="h-10 px-5 rounded-lg border border-[#E0E4E0] text-[13px] font-medium text-[#4A544A] hover:bg-[#F2F4F2] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="h-10 px-5 rounded-lg bg-[#0F6E56] text-white text-[13px] font-medium hover:bg-[#0A5A44] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2"
            >
              {portalLoading ? <Loader2 size={14} className="animate-spin" /> : 'Manage billing'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Free plan — the actual upgrade pitch ──
  return (
    <div className="min-h-screen bg-[#F7F8F7]">
      <div className="max-w-3xl mx-auto px-6 py-10">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#4A544A] hover:text-[#141A14] transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F6E56] focus-visible:ring-offset-2 rounded-md"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#0F6E56] bg-[#F0FAF5] px-2.5 py-1 rounded-full border border-[#B3DDD1] mb-4">
            <Sparkles size={11} /> Groven Pro
          </div>
          <h1 className="text-[32px] sm:text-[40px] font-semibold text-[#141A14] leading-tight mb-3">
            Run your studio without limits
          </h1>
          <p className="text-[15px] text-[#6B756B] max-w-lg mx-auto leading-relaxed">
            Unlimited clients, unlimited active requests, and AI built into every request, reply, and delivery.
          </p>
        </div>

        {/* Plan cards */}
        <div className="flex flex-col sm:flex-row gap-5 mb-12">
          <PlanCard name="Free" price={`$${Number(pricing.free.price_monthly)}`} period="/mo" features={freeFeatures} />
          <PlanCard
            name="Pro"
            price={`$${Number(pricing.pro.price_monthly)}`}
            period="/mo"
            features={PRO_FEATURES}
            highlighted
            cta="Upgrade to Pro"
            onCta={handleUpgrade}
            loading={checkoutLoading}
            footnote="Cancel or switch back any time from Settings → Plan & billing."
          />
        </div>

        {error && (
          <p className="text-center text-[13px] text-red-600 mb-10">{error}</p>
        )}

        <UnlockGrid />
        <ComparisonTable />
        <FaqSection />

        {/* Closing CTA */}
        <div className="rounded-2xl bg-[#0F6E56] px-6 py-9 text-center">
          <p className="text-[17px] font-semibold text-white mb-1.5">Ready to go unlimited?</p>
          <p className="text-[13px] text-white/70 mb-6 max-w-sm mx-auto">
            Upgrade in under a minute. Manage or cancel any time from Settings → Plan & billing.
          </p>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-lg bg-white text-[#0F6E56] text-[13px] font-medium hover:bg-[#F0FAF5] transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F6E56]"
          >
            {checkoutLoading ? <Loader2 size={15} className="animate-spin" /> : <>Upgrade to Pro <ArrowRight size={14} /></>}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-white/50 mt-5">
            <ShieldCheck size={12} /> Secure checkout via Stripe
          </p>
        </div>
      </div>
    </div>
  )
}