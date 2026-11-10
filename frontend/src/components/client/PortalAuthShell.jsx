import { CheckCircle2, Files, MessageSquare, ShieldCheck } from 'lucide-react'
import { useTenantBranding } from '../../context/TenantBrandingContext'
import AppearanceMenu from '../marketing/AppearanceMenu'
import PortalBrand from './PortalBrand'

export default function PortalAuthShell({ children, tenant, title, description }) {
  const { tenantInfo } = useTenantBranding()
  const brand = tenantInfo || tenant
  return (
    <div className="min-h-dvh bg-layout-page text-text-main lg:grid lg:grid-cols-[minmax(360px,.9fr)_1.1fr]">
      <aside className="hidden min-h-dvh flex-col justify-between border-r border-border bg-layout-card p-10 lg:flex xl:p-14">
        <PortalBrand tenant={brand} />
        <div className="my-16 max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">Your client portal</h1>
          <p className="mt-5 max-w-sm text-base leading-7 text-text-sub">{brand?.tagline || 'Manage requests, messages, and deliveries.'}</p>
          <div className="mt-10 space-y-5">
            {[{ icon: Files, text: 'Submit and track requests' }, { icon: MessageSquare, text: 'Message your provider' }, { icon: CheckCircle2, text: 'Review files and deliveries' }].map(({ icon: Icon, text }) => <div key={text} className="flex items-center gap-3 text-sm text-text-sub"><Icon size={18} className="text-text-dim" />{text}</div>)}
          </div>
        </div>
        <p className="flex items-center gap-2 text-xs text-text-dim"><ShieldCheck size={15} />Private access for your team</p>
      </aside>
      <main className="flex min-h-dvh flex-col p-5 sm:p-8 lg:p-10">
        <header className="flex items-center justify-between gap-3"><PortalBrand tenant={brand} className="lg:invisible" /><AppearanceMenu /></header>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-12 sm:py-16">
          <div className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-primary-ink">{brand?.name || 'Client portal'}</p><h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2><p className="mt-3 text-sm leading-6 text-text-sub">{description}</p></div>
          {children}
        </div>
        <p className="text-center text-xs text-text-dim">{brand?.name ? `${brand.name} · Client portal` : 'Your private client workspace'}</p>
      </main>
    </div>
  )
}
