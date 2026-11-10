import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, ArrowRight, Check, Minus, Loader2, FileText,
  Users, Inbox, MessageSquare, Send, ShieldCheck, HelpCircle,
} from 'lucide-react'

import BrandMark from '../../components/marketing/BrandMark'
import AppearanceMenu from '../../components/marketing/AppearanceMenu'
import { appUrl } from '../../utils/urls'
import { createCheckoutSession, getBillingPortalUrl } from '../../api/billing.api'
import { getPlanPricing } from '../../api/plans.api'
import { useAuth } from '../../context/AuthContext'

// ── Plan content ──────────────────────────────────────────────
function formatLimit(value) {
  return value === -1 ? 'Unlimited' : value == null ? '—' : `Up to ${value}`
}

// What you unlock — feature grid below the plan cards
const UNLOCK_ITEMS = [
  { icon: Users,         label: 'Client capacity',              desc: 'Keep your growing client relationships in one organized place.' },
  { icon: Inbox,         label: 'Request capacity',                  desc: 'Keep more projects moving with the capacity of your Pro plan.' },
  { icon: FileText,      label: 'Request summaries & categorisation',     desc: 'Turn a detailed brief into a concise summary and category.' },
  { icon: MessageSquare, label: 'Reply suggestions',              desc: 'Draft client replies in one click from the chat panel.' },
  { icon: Send,          label: 'Delivery messages',              desc: 'Generate a polished delivery note before you send files.' },
  { icon: ShieldCheck,   label: 'Priority support',                  desc: 'Get priority help when your workspace needs attention.' },
]

// Row-by-row breakdown for the comparison table
const FEATURE_ROWS = [
  { label: 'Core request pipeline',                 free: true,       pro: true },
  { label: 'Live notifications & chat',             free: true,       pro: true },
  { label: 'Request summaries & categorisation',  free: false,      pro: true },
  { label: 'Reply suggestions',                  free: false,      pro: true },
  { label: 'Delivery message suggestions',        free: false,      pro: true },
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
    <div className={`h-full rounded-2xl p-7 sm:p-8 flex flex-col ${highlighted ? 'bg-layout-card' : 'border border-border bg-layout-card'}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[15px] font-semibold text-text-main">{name}</p>
      </div>

      <div className="flex items-baseline gap-1 mt-5 mb-7">
        <p className="text-[42px] font-medium tracking-tight text-text-main">{price}</p>
        {period && <p className="text-[13px] text-text-dim">{period}</p>}
      </div>

      <ul className="space-y-3 mb-7 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[13px] text-text-sub">
            <Check size={15} className="text-primary-ink mt-0.5 flex-shrink-0" />
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
            className={`w-full h-11 rounded-lg text-[13px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
              highlighted
                ? 'bg-primary text-on-primary hover:bg-primary-dark'
                : 'bg-transparent text-text-sub border border-border hover:bg-surface'
            }`}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : (
              <>{cta}{highlighted && <ArrowRight size={14} />}</>
            )}
          </button>
          {footnote && (
            <p className="text-[11px] text-text-dim text-center mt-2.5">{footnote}</p>
          )}
        </>
      )}
    </div>
  )

  if (!highlighted) {
    return <div className="flex-1">{inner}</div>
  }

  return (
    <div className="flex-1 relative rounded-2xl bg-border p-[1.5px] dark:bg-border">
      {inner}
    </div>
  )
}

// ── Unlock grid ───────────────────────────────────────────────
function UnlockGrid() {
  return (
    <div className="mb-12">
      <h2 className="text-[16px] font-semibold text-text-main mb-5 text-center">What you unlock on Pro</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {UNLOCK_ITEMS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="rounded-2xl border border-border bg-layout-card p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary mb-3">
              <Icon size={16} className="text-on-primary" />
            </div>
            <p className="text-[13px] font-semibold text-text-main mb-1">{label}</p>
            <p className="text-[12px] text-text-sub leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Comparison table ──────────────────────────────────────────
function ComparisonCell({ value }) {
  if (value === true) return <Check size={15} className="text-primary-ink mx-auto" />
  if (value === false) return <Minus size={14} className="text-text-dim mx-auto" />
  return <span className="text-[13px] text-text-sub">{value}</span>
}

function ComparisonTable({ pricing }) {
  const rows = [
    { label: 'Clients', free: formatLimit(pricing.free.client_limit), pro: formatLimit(pricing.pro.client_limit) },
    { label: 'Active requests', free: formatLimit(pricing.free.request_limit), pro: formatLimit(pricing.pro.request_limit) },
    ...FEATURE_ROWS,
  ]
  return (
    <div className="mb-12">
      <h2 className="text-[16px] font-semibold text-text-main mb-5 text-center">Compare plans in detail</h2>
      <div className="border border-border rounded-2xl overflow-hidden bg-layout-card">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-surface text-text-dim text-left">
                <th className="font-medium px-5 py-3">Feature</th>
                <th className="font-medium px-5 py-3 text-center w-32">Free</th>
                <th className="font-medium px-5 py-3 text-center w-32 text-primary-ink">Pro</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <td className="px-5 py-3 text-text-main">{row.label}</td>
                  <td className="px-5 py-3 text-center"><ComparisonCell value={row.free} /></td>
                  <td className="px-5 py-3 text-center bg-primary-light dark:bg-surface"><ComparisonCell value={row.pro} /></td>
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
        <HelpCircle size={15} className="text-text-dim" />
        <h2 className="text-[16px] font-semibold text-text-main">Common questions</h2>
      </div>
      <div className="max-w-xl mx-auto divide-y divide-border border border-border rounded-2xl bg-layout-card overflow-hidden">
        {FAQ_ITEMS.map((item) => (
          <div key={item.q} className="px-5 py-4">
            <p className="text-[13px] font-medium text-text-main mb-1">{item.q}</p>
            <p className="text-[12px] text-text-sub leading-relaxed">{item.a}</p>
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

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError] = useState(null)
  const [pricing, setPricing] = useState({ free: {}, pro: {} })
  const [pricingError, setPricingError] = useState(false)

  const freeFeatures = [
    `${formatLimit(pricing.free.client_limit)} clients`,
    `${formatLimit(pricing.free.request_limit)} active requests`,
    'Core request pipeline',
    'Live notifications & chat',
  ]


  const { tenant, isAuth } = useAuth()
  const isPro = isAuth && (tenant?.is_pro ?? false)
  const proFeatures = [
    `${formatLimit(pricing.pro.client_limit)} clients`,
    `${formatLimit(pricing.pro.request_limit)} active requests`,
    'Request summaries & categorisation',
    'Reply & delivery message suggestions',
    'Priority support',
  ]

  useEffect(() => {
    let active = true
    getPlanPricing()
      .then(res => { if (active) { if (!res.data.data?.free || !res.data.data?.pro) throw new Error('Missing plan details'); setPricing(res.data.data) } })
      .catch(() => { if (active) setPricingError(true) })
      .finally(() => { if (active) setPlanLoading(false) })
    return () => { active = false }
  }, [])

  const handleUpgrade = async () => {
    if (!isAuth) { window.location.href = appUrl(null, '/signup'); return }
    if (!tenant) { window.location.href = appUrl(null, '/portals'); return }
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
  if (planLoading) {
    return (
      <div role="status" aria-label="Loading plan details" className="min-h-screen bg-layout-page flex items-center justify-center">
        <Loader2 size={22} className="animate-spin text-primary-ink" />
      </div>
    )
  }

  if (pricingError) {
    return <div className="flex min-h-screen items-center justify-center bg-layout-page p-6 text-text-main"><div role="alert" className="w-full max-w-md rounded-[24px] border border-border bg-layout-card p-8 text-center"><h1 className="text-2xl font-medium tracking-tight">Plan details are taking a moment.</h1><p className="mt-3 text-sm leading-7 text-text-sub">We couldn’t load current pricing. Please try again.</p><button type="button" onClick={() => window.location.reload()} className="mt-6 min-h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-dark">Try again</button><button type="button" onClick={() => navigate(-1)} className="mx-auto mt-3 block min-h-10 px-4 text-xs text-text-sub">Go back</button></div></div>
  }

  // ── Already on Pro — don't show an upgrade pitch, show account status instead ──
  if (isPro) {
    return (
      <div className="min-h-screen bg-layout-page flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
            <FileText size={22} className="text-on-primary" />
          </div>
          <h1 className="text-[22px] font-semibold text-text-main mb-2">You're already on Groven Pro</h1>
          <p className="text-[14px] text-text-sub mb-7 leading-relaxed">
            Your Pro capacity and writing tools are ready to use. Manage your subscription whenever you need.
          </p>
          {error && <p className="text-[13px] text-status-danger-text mb-4">{error}</p>}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="h-10 px-5 rounded-lg border border-border text-[13px] font-medium text-text-sub hover:bg-surface transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              Back to dashboard
            </button>
            <button
              type="button"
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="h-10 px-5 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
    <div className="min-h-screen bg-layout-page">
      <header className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-6 sm:px-8"><BrandMark /><AppearanceMenu /></header>
      <main className="max-w-[960px] mx-auto px-5 py-6 sm:px-8 sm:py-10">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-sub hover:text-text-main transition-colors mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-md"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary-ink bg-primary-light px-2.5 py-1 rounded-full border border-border mb-4">
            <FileText size={11} /> Groven Pro
          </div>
          <h1 className="text-[36px] sm:text-[48px] tracking-[-0.045em] font-medium text-text-main leading-tight mb-3">
            Choose your workspace plan.
          </h1>
          <p className="text-[15px] text-text-sub max-w-lg mx-auto leading-relaxed">
            Choose the space you need, with request summaries and writing tools.
          </p>
        </div>

        {/* Plan cards */}
        <div className="flex flex-col sm:flex-row gap-5 mb-12">
          <PlanCard name="Free" price={`$${Number(pricing.free.price_monthly)}`} period="/mo" features={freeFeatures} cta={isAuth ? 'Your workspace' : 'Start with Free'} onCta={() => { window.location.href = appUrl(null, isAuth ? '/portals' : '/signup') }} />
          <PlanCard
            name="Pro"
            price={`$${Number(pricing.pro.price_monthly)}`}
            period="/mo"
            features={proFeatures}
            highlighted
            cta={isAuth ? 'Upgrade to Pro' : 'Get started'}
            onCta={handleUpgrade}
            loading={checkoutLoading}
            footnote="Cancel or switch back any time from Settings → Plan & billing."
          />
        </div>

        {error && (
          <p className="text-center text-[13px] text-status-danger-text mb-10">{error}</p>
        )}

        <UnlockGrid />
        <ComparisonTable pricing={pricing} />
        <FaqSection />

        {/* Closing CTA */}
        <div className="rounded-2xl border border-border bg-layout-card px-6 py-9 text-center">
          <p className="text-[17px] font-semibold text-text-main mb-1.5">Upgrade your workspace.</p>
          <p className="text-[13px] text-text-sub mb-6 max-w-sm mx-auto">
            Choose Pro for more capacity and writing tools. Manage your plan any time from Settings → Plan & billing.
          </p>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={checkoutLoading}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-6 rounded-lg bg-primary text-on-primary text-[13px] font-medium hover:bg-primary-dark transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary"
          >
            {checkoutLoading ? <Loader2 size={15} className="animate-spin" /> : <>{isAuth ? 'Upgrade to Pro' : 'Get started'} <ArrowRight size={14} /></>}
          </button>
          <p className="flex items-center justify-center gap-1.5 text-[11px] text-text-dim mt-5">
            <ShieldCheck size={12} /> Secure checkout via Stripe
          </p>
        </div>
      </main>
    </div>
  )
}
