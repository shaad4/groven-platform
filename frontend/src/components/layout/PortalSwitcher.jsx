import { useState, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Check, ChevronDown, ArrowUpRight, Layers3 } from 'lucide-react'
import { selectTenant, selectMemberships, selectTotalPortalCount } from '../../features/auth/authSlice'
import { appUrl } from '../../utils/urls'

function PortalAvatar({ name, logo }) {
  const initials = (name || 'Groven').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-primary-light text-xs font-semibold text-primary-ink">{logo ? <img src={logo} alt="" className="h-full w-full object-cover" /> : initials}</span>
}

export default function PortalSwitcher() {
  const tenant = useSelector(selectTenant)
  const memberships = useSelector(selectMemberships)
  const totalPortals = useSelector(selectTotalPortalCount)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const triggerRef = useRef(null)
  useEffect(() => {
    const handler = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    const escape = e => { if (e.key === 'Escape' && open) { setOpen(false); triggerRef.current?.focus() } }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', handler); document.removeEventListener('keydown', escape) }
  }, [open])
  const goTo = (slug, role) => { setOpen(false); window.location.replace(appUrl(slug, role === 'provider' ? '/dashboard' : '/portal')) }
  const groups = [{ label: 'Workspaces', role: 'provider', portals: memberships?.provider_portals || [] }, { label: 'Client portals', role: 'client', portals: memberships?.client_portals || [] }]

  return <div className="relative" ref={ref}>
    <button ref={triggerRef} type="button" aria-expanded={open} aria-label={`Current workspace: ${tenant?.name || 'Groven'}. ${totalPortals > 1 ? 'Switch workspace' : ''}`} onClick={() => totalPortals > 1 && setOpen(v => !v)} className="flex w-full items-center gap-2.5 rounded-xl py-2 text-left transition-colors hover:bg-on-primary/5">
      <PortalAvatar name={tenant?.name} logo={tenant?.logo_url} />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-on-primary">{tenant?.name || 'Groven'}</span><span className="mt-0.5 block text-[11px] text-on-primary/60">Client workspace</span></span>
      {totalPortals > 1 && <ChevronDown size={14} className={`shrink-0 text-on-primary/60 transition-transform ${open ? 'rotate-180' : ''}`} />}
    </button>
    {open && <div className="absolute left-0 top-full z-[60] mt-2 w-[264px] overflow-hidden rounded-2xl border border-border bg-layout-card p-1.5 shadow-xl">
      {groups.map(({ label, role, portals }) => portals.length > 0 && <div key={role} className="mb-1"><p className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-text-dim">{label}</p>{portals.map(portal => <button type="button" key={portal.tenant_slug} onClick={() => portal.tenant_slug !== tenant?.slug && goTo(portal.tenant_slug, role)} className={`flex min-h-12 w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors ${portal.tenant_slug === tenant?.slug ? 'bg-primary-light' : 'hover:bg-surface'}`}><PortalAvatar name={portal.tenant_name} logo={portal.tenant_logo} /><span className="min-w-0 flex-1 truncate text-sm text-text-main">{portal.tenant_name}</span>{portal.tenant_slug === tenant?.slug && <Check size={15} className="text-primary-ink" />}</button>)}</div>)}
      <button type="button" onClick={() => window.location.replace(appUrl(null, '/portals'))} className="mt-1 flex min-h-11 w-full items-center gap-2 rounded-xl border-t border-border px-2 text-sm text-text-sub hover:bg-surface"><Layers3 size={15} /><span className="flex-1 text-left">All portals</span><ArrowUpRight size={14} /></button>
    </div>}
  </div>
}
