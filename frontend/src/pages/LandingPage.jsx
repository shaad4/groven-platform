import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, FileText, LockKeyhole, Menu, MessageSquare, Paperclip, X } from 'lucide-react'
import { getPlanPricing } from '../api/plans.api'
import ThemeToggle from '../components/ui/ThemeToggle'
import BrandMark from '../components/marketing/BrandMark'
import AppearanceMenu from '../components/marketing/AppearanceMenu'
import RequestWorkflow from '../components/marketing/RequestWorkflow'
import StudioIllustration from '../components/marketing/StudioIllustration'

const primaryLink = 'landing-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-dark'
const secondaryLink = 'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-border bg-layout-card px-5 py-3 text-sm font-medium text-text-main transition-colors hover:bg-surface'

function Reveal({ children, className = '', delay = 0 }) {
  const reducedMotion = useReducedMotion()
  return <motion.div initial={reducedMotion ? false : { opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-30px' }} transition={{ duration: 0.22, delay }} className={className}>{children}</motion.div>
}

const features = [
  { number: '01', icon: FileText, title: 'Start with the brief.', text: 'Clients submit requests with the context and files you need. Your team can categorize the work and track its status.', detail: 'Brief · Attachments · Status' },
  { number: '02', icon: MessageSquare, title: 'Keep the conversation attached.', text: 'Ask a question, share an update, or discuss a revision inside the request. Everyone can follow the same conversation.', detail: 'Messages · Notifications · Feedback' },
  { number: '03', icon: Paperclip, title: 'Deliver with a record.', text: 'Share the finished files and send work for review. Keep approvals and previous feedback alongside the original request.', detail: 'Delivery · Review · Approval' },
]

const faqs = [
  ['Who is Groven for?', 'Groven is built for agencies, independent studios, and service teams that manage ongoing client work.'],
  ['What does my client see?', 'Clients enter your branded portal to submit requests, share files, follow progress, and review deliveries. They see their own work and conversations.'],
  ['Can I start with the Free plan?', 'Yes. Start on the Free plan and move to Pro when you need more capacity or request-writing tools. Current plan limits are listed above.'],
  ['Can I manage my subscription later?', 'Yes. You can manage your subscription from Settings → Plan & billing. Payments and billing are handled through Stripe.'],
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [pricing, setPricing] = useState(null)
  const [pricingFailed, setPricingFailed] = useState(false)

  useEffect(() => {
    let active = true
    getPlanPricing().then(res => { if (active) setPricing(res.data.data) }).catch(() => { if (active) setPricingFailed(true) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!menuOpen) return undefined
    const close = event => { if (event.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [menuOpen])

  const free = pricing?.free
  const pro = pricing?.pro
  const priceLabel = plan => plan?.price_monthly != null ? `$${Number(plan.price_monthly)}` : pricingFailed ? '—' : '…'
  const limitLabel = (value, noun) => value == null ? '—' : value === -1 ? `Unlimited ${noun}` : `Up to ${value} ${noun}`
  const planRows = [
    ['Clients', limitLabel(free?.client_limit, 'clients'), limitLabel(pro?.client_limit, 'clients')],
    ['Active requests', limitLabel(free?.request_limit, 'requests'), limitLabel(pro?.request_limit, 'requests')],
    ['Requests, files & chat', true, true],
    ['Summaries & message suggestions', false, true],
    ['Priority support', false, true],
  ]

  return (
    <div className="landing-page overflow-x-clip bg-layout-page text-text-main">
      <a href="#main-content" className="sr-only z-[100] rounded-lg bg-layout-card p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <header className="sticky top-0 z-50 border-b border-border bg-layout-page/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-8">
          <BrandMark />
          <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[13px] font-medium text-text-sub md:flex"><a href="#features" className="transition-colors hover:text-primary-ink">How it works</a><a href="#experience" className="transition-colors hover:text-primary-ink">Client portal</a><a href="#pricing" className="transition-colors hover:text-primary-ink">Pricing</a></nav>
          <div className="flex items-center gap-2 sm:gap-4"><Link to="/login" className="hidden text-[13px] font-medium text-text-sub hover:text-primary-ink sm:block">Sign in</Link><Link to="/signup" className="landing-primary-action hidden items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-dark md:inline-flex">Get started <ArrowUpRight size={14} /></Link><AppearanceMenu className="hidden md:block" /><button type="button" aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(open => !open)} className="flex h-11 w-11 items-center justify-center rounded-lg text-text-main md:hidden">{menuOpen ? <X size={20} /> : <Menu size={20} />}</button></div>
        </div>
        {menuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="border-t border-border bg-layout-card px-5 py-5 md:hidden"><div className="mx-auto flex max-w-lg flex-col gap-1">{[['#features', 'How it works'], ['#experience', 'Client portal'], ['#pricing', 'Pricing']].map(([href, label]) => <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-surface">{label}</a>)}<Link to="/login" className="rounded-lg px-3 py-3 text-sm font-medium">Sign in</Link><Link to="/signup" className={`${primaryLink} mt-3`}>Create your workspace <ArrowRight size={16} /></Link><div className="mt-4 border-t border-border pt-4"><p className="mb-3 text-xs font-medium text-text-sub">Appearance</p><div onClick={event => { if (event.target.closest('button')) setMenuOpen(false) }}><ThemeToggle /></div></div></div></nav>}
      </header>

      <main id="main-content">
        <section className="px-5 pb-14 pt-10 sm:px-8 sm:pb-20 sm:pt-16 lg:py-20">
          <div className="mx-auto grid max-w-[1216px] gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start lg:gap-x-14 lg:gap-y-5 xl:gap-x-20">
            <Reveal className="pb-1">
              <p className="mb-6 text-xs text-text-sub">For studios, agencies & service teams</p>
              <h1 className="max-w-[510px] text-[43px] font-medium leading-[1.06] tracking-[-0.055em] sm:text-[58px] lg:text-[60px] xl:text-[66px]">From client brief to <span className="landing-accent">approved work.</span></h1>
              <p className="mt-6 max-w-[400px] text-[15px] leading-7 text-text-sub">A shared workspace for requests, conversations, and deliveries. Give your team the context and your clients a clear next step.</p>
              <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3"><Link to="/signup" className={primaryLink}>Create your workspace <ArrowRight size={16} /></Link><a href="#workspace-preview" className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-text-sub hover:text-text-main">Follow a request <ArrowDown size={14} /></a></div>
              <p className="mt-3 text-[11px] text-text-dim">Start with the Free plan.</p>
            </Reveal>
            <Reveal className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-3" delay={0.08}><div id="workspace-preview" className="scroll-mt-28"><RequestWorkflow /></div></Reveal>
            <StudioIllustration className="mx-auto max-w-[440px] lg:col-start-1 lg:row-start-2" />
          </div>
        </section>

        <section id="features" className="scroll-mt-20 border-y border-border bg-layout-card px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-[1216px]">
            <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-12 sm:flex-row sm:items-baseline"><h2 className="text-[28px] font-medium tracking-[-0.035em] sm:text-[34px]">One request. The whole record.</h2><p className="text-xs text-text-dim">From the first message to the final file</p></div>
            <div className="border-t border-border">{features.map(({ number, icon: Icon, title, text, detail }) => <Reveal key={number} className="landing-feature-row grid gap-4 border-b border-border py-7 sm:grid-cols-[40px_1fr] sm:gap-x-6 lg:grid-cols-[40px_1fr_1fr] lg:gap-x-10 lg:py-9"><span className="landing-feature-index text-xs font-medium tabular-nums">{number}</span><div className="sm:col-start-2 lg:col-start-auto"><h3 className="text-xl font-medium tracking-tight sm:text-[23px]">{title}</h3><p className="mt-3 flex items-center gap-2 text-[11px] text-text-dim"><Icon size={13} />{detail}</p></div><p className="max-w-lg text-sm leading-7 text-text-sub sm:col-start-2 lg:col-start-auto">{text}</p></Reveal>)}</div>
          </div>
        </section>

        <section id="experience" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-[1216px]">
            <Reveal className="mb-9 grid gap-5 lg:grid-cols-2 lg:gap-20"><div><p className="mb-4 text-xs text-text-dim">Your workspace / Their portal</p><h2 className="max-w-md text-[32px] font-medium leading-[1.15] tracking-[-0.04em] sm:text-[40px]">The same work.<br />The right view for each side.</h2></div><div className="lg:pt-7"><p className="max-w-lg text-sm leading-7 text-text-sub">Your team manages the client list and request queue. Each client gets a separate portal with your business name, logo, and colors, showing their own requests and conversations.</p><p className="mt-4 flex items-center gap-2 text-xs text-text-sub"><LockKeyhole size={14} />Clients see only their own work.</p></div></Reveal>
            <Reveal className="grid overflow-hidden rounded-xl border border-border bg-layout-card md:grid-cols-2">
              <div className="border-b border-border p-5 sm:p-7 md:border-b-0 md:border-r"><div className="mb-7 flex items-center justify-between gap-3 text-[11px]"><span className="font-medium">Your team</span><span className="text-text-dim">Provider workspace</span></div><p className="mb-1 text-xs text-text-dim">Requests</p><h3 className="text-xl font-medium tracking-tight">Across your clients</h3><div className="mt-6 divide-y divide-border border-y border-border">{[['North Coffee', 'Spring launch assets', 'In review'], ['Field Studio', 'Website updates', 'In progress'], ['North Coffee', 'Packaging artwork', 'Completed']].map(([client, request, status]) => <div key={request} className="flex items-center justify-between gap-3 py-4"><div className="min-w-0"><p className="truncate text-xs font-medium">{request}</p><p className="mt-1 text-[11px] text-text-dim">{client}</p></div><span className="shrink-0 text-[10px] text-text-sub">{status}</span></div>)}</div></div>
              <div className="landing-client-view p-5 sm:p-7"><div className="mb-7 flex items-center justify-between gap-3 text-[11px]"><span className="landing-client-label font-medium">Your client</span><span className="text-text-dim">Branded client portal</span></div><div className="flex items-center justify-between gap-4 border-b border-border pb-4"><span className="text-lg font-semibold tracking-tight">studio north</span><span className="text-[10px] text-text-dim">North Coffee</span></div><p className="mt-5 text-xs text-text-dim">Ready for your feedback</p><h3 className="mt-1.5 text-xl font-medium tracking-tight">Spring launch assets</h3><p className="mt-3 max-w-sm text-xs leading-6 text-text-sub">Your latest delivery is ready to review. Open the files and share feedback with the team.</p><div className="mt-5 flex items-center gap-2.5 border-y border-border py-3.5 text-xs"><FileText size={16} className="text-text-dim" /><span className="min-w-0 break-words">spring-campaign-review.pdf</span></div><p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-primary-ink">Review this request <ArrowUpRight size={13} /></p></div>
            </Reveal>
            <p className="mt-3 text-[10px] leading-5 text-text-dim">Example provider and client views. Add your own branding in workspace settings.</p>
          </div>
        </section>

        <section id="pricing" className="scroll-mt-20 border-y border-border bg-layout-card px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto grid max-w-[1216px] gap-9 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
            <Reveal><p className="mb-4 text-xs text-text-dim">Plans</p><h2 className="text-[32px] font-medium tracking-[-0.04em] sm:text-[40px]">Start with your<br />next client.</h2><p className="mt-5 max-w-xs text-sm leading-7 text-text-sub">Use Free for a smaller client list. Move to Pro when you need more capacity and writing tools.</p><Link to="/upgrade" className="mt-6 inline-flex min-h-11 items-center gap-2 text-xs font-medium text-primary-ink">Full plan details <ArrowUpRight size={14} /></Link></Reveal>
            <Reveal className="min-w-0">
              <table className="w-full table-fixed border-collapse text-left"><caption className="sr-only">Free and Pro plan comparison</caption><thead><tr className="border-b border-border"><th scope="col" className="w-[38%] pb-5 pr-3 align-bottom text-xs font-normal text-text-dim">Monthly billing</th>{[['Free', free], ['Pro', pro]].map(([label, plan]) => <th key={label} scope="col" className="pb-5 pl-3 align-top font-normal"><span className="text-xs font-medium">{label}</span><span className="mt-3 block text-3xl font-medium tracking-tight sm:text-4xl">{priceLabel(plan)}</span><span className="mt-1 block text-[10px] text-text-dim">per month</span></th>)}</tr></thead><tbody>{planRows.map(([label, freeValue, proValue]) => <tr key={label} className="border-b border-border"><th scope="row" className="py-4 pr-3 text-[11px] font-normal leading-5 text-text-sub sm:text-xs">{label}</th>{[freeValue, proValue].map((value, index) => <td key={index} className="py-4 pl-3 text-[11px] leading-5 sm:text-xs">{typeof value === 'boolean' ? value ? <><Check size={15} className="text-primary-ink" aria-hidden="true" /><span className="sr-only">Included</span></> : <span className="text-text-dim"><span aria-hidden="true">—</span><span className="sr-only">Not included</span></span> : value}</td>)}</tr>)}</tbody><tfoot><tr><td /><td className="pt-5 pl-3"><Link to="/signup" className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-2 text-[11px] font-medium hover:bg-surface sm:text-xs">Start Free</Link></td><td className="pt-5 pl-3"><Link to="/signup" className="landing-primary-action inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-2 text-[11px] font-medium text-on-primary hover:bg-primary-dark sm:text-xs">Choose Pro</Link></td></tr></tfoot></table>
              {pricingFailed && <p className="mt-4 text-xs leading-6 text-text-sub">Live pricing is temporarily unavailable. <Link to="/upgrade" className="text-primary-ink underline">Check current plan details</Link>.</p>}
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto grid max-w-[1216px] gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20"><h2 className="text-[28px] font-medium tracking-[-0.035em]">Before you get started</h2><div className="divide-y divide-border border-y border-border">{faqs.map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium [&::-webkit-details-marker]:hidden">{question}<ChevronDown size={17} className="shrink-0 text-text-dim transition-transform group-open:rotate-180" /></summary><p className="mt-3 pr-7 text-sm leading-7 text-text-sub">{answer}</p></details>)}</div></div></section>

        <section className="px-5 pb-16 sm:px-8"><div className="mx-auto flex max-w-[1216px] flex-col items-start justify-between gap-6 border-t border-border pt-10 sm:flex-row sm:items-center"><div><h2 className="text-2xl font-medium tracking-[-0.035em]">Set up your client workspace.</h2><p className="mt-2 text-sm text-text-sub">Add your brand, invite a client, and take the first request.</p></div><Link to="/signup" className={`${secondaryLink} shrink-0`}>Create your workspace <ArrowRight size={16} /></Link></div></section>
      </main>

      <footer className="border-t border-border px-5 py-9 sm:px-8"><div className="mx-auto flex max-w-[1216px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><BrandMark /><p className="mt-3 text-xs text-text-dim">Client requests, files, and conversations.</p></div><nav aria-label="Footer navigation" className="flex flex-wrap gap-6 text-xs text-text-sub"><a href="#features" className="hover:text-primary-ink">How it works</a><a href="#pricing" className="hover:text-primary-ink">Pricing</a><Link to="/login" className="hover:text-primary-ink">Sign in</Link><Link to="/signup" className="hover:text-primary-ink">Get started</Link></nav></div><div className="mx-auto mt-8 max-w-[1216px] border-t border-border pt-6 text-[11px] text-text-dim">© {new Date().getFullYear()} Groven.</div></footer>
    </div>
  )
}
