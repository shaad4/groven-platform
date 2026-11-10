import { useTenantBranding } from '../../context/TenantBrandingContext'

export default function PortalBrand({ tenant, compact = false, light = false, className = '' }) {
  const { tenantInfo, colors } = useTenantBranding()
  const brand = tenantInfo || tenant
  const name = brand?.name || 'Client portal'
  const initials = name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {brand?.logo_url ? <img src={brand.logo_url} alt={name} className="h-10 w-10 shrink-0 rounded-xl border border-border/50 bg-white p-1 object-contain" /> : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white" style={{ background: colors.accent }}>{initials}</div>}
      {!compact && <div className="min-w-0"><p className={`truncate text-sm font-semibold ${light ? 'text-white' : 'text-text-main'}`}>{name}</p><p className={`mt-0.5 truncate text-xs ${light ? 'text-white/60' : 'text-text-sub'}`}>Your client workspace</p></div>}
    </div>
  )
}
