import { ArrowRight, Building2 } from 'lucide-react'
import { getSubdomain } from '../utils/domain'
import { appUrl } from '../utils/urls'
import AppearanceMenu from '../components/marketing/AppearanceMenu'

export default function WorkspaceNotFoundPage() {
  const subdomain = getSubdomain()
  return <div className="flex min-h-screen flex-col bg-layout-page px-5 text-text-main"><div className="flex justify-end py-6"><AppearanceMenu /></div><main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center pb-20 text-center"><span className="mb-7 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-layout-card text-primary-ink"><Building2 size={27} strokeWidth={1.5} /></span><h1 className="text-[32px] font-medium tracking-[-0.04em]">Workspace not found.</h1><p className="mt-4 text-sm leading-7 text-text-sub">{subdomain ? <>The workspace <strong className="break-all font-medium text-text-main">{subdomain}</strong> </> : 'This workspace '}doesn’t exist or has been deactivated. Check the address, or contact the person who invited you.</p><a href={appUrl(null, '/')} className="mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-on-primary hover:bg-primary-dark">Go to Groven <ArrowRight size={15} /></a></main></div>
}
