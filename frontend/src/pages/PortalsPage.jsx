import { useSelector } from 'react-redux'
import { ArrowRight, Building2, CirclePause, LayoutGrid, LogOut, Plus, ShieldCheck } from 'lucide-react'
import { selectCurrentUser, selectMemberships } from '../features/auth/authSlice'
import { useAuth } from '../context/AuthContext'
import { appUrl } from '../utils/urls'
import BrandMark from '../components/marketing/BrandMark'
import AppearanceMenu from '../components/marketing/AppearanceMenu'
import { Skeleton } from '../components/ui/Skeleton'

function PortalCard({ portal, role }) {
  const suspended = portal.is_suspended
  const initials = (portal.tenant_name || '').split(' ').filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase()
  return <button type="button" disabled={suspended} onClick={() => window.location.replace(appUrl(portal.tenant_slug, role === 'provider' ? '/dashboard' : '/portal'))} className="group flex min-h-24 w-full items-center gap-4 rounded-2xl border border-border bg-layout-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60 sm:p-5" aria-label={`${portal.tenant_name}, ${suspended ? 'suspended, unavailable' : role === 'provider' ? 'open your workspace' : 'open client portal'}`}><span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-light text-sm font-semibold text-primary-ink">{portal.tenant_logo ? <img src={portal.tenant_logo} alt="" className="h-full w-full object-contain" /> : initials || <Building2 size={20} />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-text-main">{portal.tenant_name}</span><span className="mt-1.5 block truncate text-xs text-text-dim">{portal.tenant_slug}.groven.in</span></span>{suspended ? <span className="inline-flex items-center gap-1 rounded-full bg-status-review-bg px-2 py-1 text-[10px] font-medium text-status-review-text"><CirclePause size={12} />Unavailable</span> : <ArrowRight size={17} className="shrink-0 text-text-dim transition-transform group-hover:translate-x-1 group-hover:text-primary-ink" />}</button>
}

export default function PortalsPage() {
  const user = useSelector(selectCurrentUser)
  const memberships = useSelector(selectMemberships)
  const { logout } = useAuth()
  const providerPortals = memberships?.provider_portals ?? []
  const clientPortals = memberships?.client_portals ?? []
  const hasAny = providerPortals.length > 0 || clientPortals.length > 0
  const firstName = user?.display_name?.split(' ')[0]

  return <div className="min-h-screen bg-layout-page text-text-main"><header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8"><BrandMark /><AppearanceMenu /></header><main className="mx-auto max-w-[660px] px-5 pb-16 pt-10 sm:pt-16"><div className="mb-9"><span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-layout-card text-primary-ink"><LayoutGrid size={22} /></span><p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary-ink">Workspaces</p><h1 className="mt-3 text-[32px] font-medium leading-tight tracking-[-0.04em] sm:text-[38px]">{firstName ? `Welcome, ${firstName}` : 'Welcome back.'}</h1><p className="mt-3 text-sm leading-7 text-text-sub">Choose a workspace to continue.</p></div>
    {!memberships ? <div role="status" aria-busy="true" className="space-y-3"><span className="sr-only">Loading your workspaces</span>{[0, 1].map(index => <div key={index} className="flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-layout-card p-4 sm:p-5"><Skeleton className="h-12 w-12 shrink-0 rounded-xl" /><div className="flex-1 space-y-3"><Skeleton className="h-3 w-3/5" /><Skeleton className="h-2 w-2/5" /></div><Skeleton className="h-4 w-4" /></div>)}</div> : <>
      {[{ title: 'Your workspace', icon: Building2, portals: providerPortals, role: 'provider' }, { title: 'Client portals', icon: ShieldCheck, portals: clientPortals, role: 'client' }].filter(section => section.portals.length > 0).map(({ title, icon: Icon, portals, role }) => <section key={role} className="mb-7"><h2 className="mb-3 flex items-center gap-2 text-xs font-semibold text-text-sub"><Icon size={14} />{title}<span className="ml-auto text-[10px] font-normal text-text-dim">{portals.length} {portals.length === 1 ? 'space' : 'spaces'}</span></h2><div className="space-y-3">{portals.map(portal => <PortalCard key={portal.tenant_slug} portal={portal} role={role} />)}</div></section>)}
      {!hasAny && <div className="rounded-[22px] border border-dashed border-border bg-layout-card px-6 py-9 text-center"><span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary-light text-primary-ink"><Plus size={21} /></span><h2 className="mt-4 text-lg font-medium">Create your first workspace</h2><p className="mt-2 text-sm leading-6 text-text-sub">Create a space for your business, or use a client invitation to join an existing portal.</p><a href={appUrl(null, '/setup-workspace')} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-dark">Create workspace <ArrowRight size={15} /></a></div>}
      {!providerPortals.length && hasAny && <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-sm font-medium">Create a workspace for your business</p><p className="mt-1.5 text-xs leading-5 text-text-sub">Create your own space for clients and work.</p></div><a href={appUrl(null, '/setup-workspace')} className="inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-primary-ink">Start free <ArrowRight size={14} /></a></div>}
    </>}
    <div className="mt-9 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="break-words text-[11px] leading-6 text-text-dim">Signed in as <span className="font-medium text-text-sub">{user?.email}</span></p><button type="button" onClick={logout} className="inline-flex min-h-10 items-center gap-2 self-start text-xs font-medium text-text-sub hover:text-primary-ink"><LogOut size={14} />Sign out</button></div>
  </main></div>
}
