import { AlertTriangle } from 'lucide-react'
import GroveLogo from '../components/layout/GroveLogo'
import { getSubdomain } from '../utils/domain'
import { appUrl } from '../utils/urls'

export default function WorkspaceNotFoundPage() {
  const subdomain = getSubdomain()

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f8f6] px-4">
      <div className="w-full max-w-[420px] rounded-[24px] border border-[#e8eae8] bg-white p-10 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f5dfb0] bg-[#fef3e2] mx-auto">
          <AlertTriangle size={28} className="text-[#92500a]" />
        </div>
        <h1 className="mt-6 text-[22px] font-semibold text-[#0a2e24]">
          Workspace not found
        </h1>
        <p className="mt-3 text-[14px] leading-7 text-[#9ea89e]">
          The workspace{' '}
          {subdomain && (
            <strong className="text-[#0a2e24]">"{subdomain}"</strong>
          )}{' '}
          doesn't exist or has been deactivated.
        </p>
        
          <a href={appUrl(null, '')}
          className="mt-6 inline-block rounded-xl bg-[#0f6e56] px-6 py-2.5 text-[13px] font-medium text-white hover:bg-[#0c5b47]">
          Go to Groven homepage
        </a>
        <div className="mt-8 flex items-center justify-center gap-1.5">
          <GroveLogo size="sm" variant="icon" />
          <span className="text-[11px] text-[#9ea89e]">Powered by Groven</span>
        </div>
      </div>
    </div>
  )
}