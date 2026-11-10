import { useTenantBranding } from '../../context/TenantBrandingContext'
import { getSubdomain } from '../../utils/domain'
import AppearanceMenu from '../marketing/AppearanceMenu'
import BrandMark from '../marketing/BrandMark'
import ProductPreview from '../marketing/ProductPreview'

export default function AuthShell({ children, centered = false, tenantAware = false, eyebrow = 'Groven workspace', title = 'Manage your client work.', description = 'Organize requests, share updates, and keep files with the work.' }) {
  const { tenantInfo } = useTenantBranding()
  const isTenant = tenantAware && !!getSubdomain()
  const tenantName = tenantInfo?.name || 'Your workspace'

  return (
    <div className="min-h-screen bg-layout-page text-text-main">
      <header className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-5 py-5 sm:px-10 lg:px-12">
        {isTenant ? <a href="/client-login" className="flex min-w-0 items-center gap-3 font-semibold"><span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary-light text-primary-ink">{tenantInfo?.logo_url ? <img src={tenantInfo.logo_url} alt="" className="h-full w-full object-contain" /> : tenantName.charAt(0).toUpperCase()}</span><span className="truncate">{tenantName}</span></a> : <BrandMark />}
        <AppearanceMenu />
      </header>
      <main className={centered || isTenant ? 'mx-auto flex min-h-[calc(100vh-90px)] max-w-2xl items-center justify-center px-5 pb-16 pt-8 sm:px-8' : 'mx-auto grid max-w-[1600px] items-center gap-12 px-5 pb-12 pt-6 sm:px-10 lg:min-h-[calc(100vh-90px)] lg:grid-cols-2 lg:px-12 lg:py-10'}>
        <div className={`w-full ${centered || isTenant ? 'max-w-[480px] rounded-2xl border border-border bg-layout-card p-6 shadow-sm sm:p-10' : 'mx-auto max-w-[430px] py-4 sm:py-8'}`}>{children}</div>
        {!centered && !isTenant && <aside className="relative hidden overflow-hidden rounded-2xl border border-border bg-surface p-8 lg:block xl:p-12">
          <p className="mb-5 text-xs font-medium text-text-sub">{eyebrow}</p>
          <h2 className="max-w-lg text-[38px] font-medium leading-[1.12] tracking-[-0.04em] xl:text-[46px]">{title}</h2>
          <p className="mb-9 mt-5 max-w-md text-sm leading-7 text-text-sub">{description}</p>
          <ProductPreview compact />
        </aside>}
      </main>
    </div>
  )
}
