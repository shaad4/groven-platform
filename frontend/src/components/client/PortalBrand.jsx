import { useTenantBranding } from '../../context/TenantBrandingContext'

export default function PortalBrand({ tenant, compact = false, dense = false, light = false, className = '' }) {
  const { tenantInfo, colors } = useTenantBranding()
  const brand = tenantInfo || tenant
  const name = brand?.name || 'Client portal'
  const initials = name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase()
  const markSize = dense ? 'h-8 w-8 rounded-lg' : 'h-10 w-10 rounded-xl'
  return (
    <div className={`flex min-w-0 items-center gap-3 ${className}`}>
      {brand?.logo_url ? <img src={brand.logo_url} alt={name} className={`${markSize} shrink-0 border border-border/50 bg-white p-1 object-contain`} /> : <div className={`${markSize} flex shrink-0 items-center justify-center text-sm font-semibold text-white`} style={{ background: colors.accent }}>{initials}</div>}
      {!compact && <div className="min-w-0"><p className={`truncate text-sm font-semibold ${light ? 'text-white' : 'text-text-main'}`}>{name}</p>{!dense && <p className={`mt-0.5 truncate text-xs ${light ? 'text-white/60' : 'text-text-sub'}`}>Your client workspace</p>}</div>}
    </div>
  )
}
