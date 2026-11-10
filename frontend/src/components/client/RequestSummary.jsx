import { Link } from 'react-router-dom'
import { ArrowUpRight, CheckCircle2, Clock3, FileText, MessageSquareDot, PackageCheck, SearchCheck } from 'lucide-react'
import { timeAgo } from '../../utils/clientHelpers'

export const REQUEST_STATUS = {
  received: { label: 'Submitted', icon: FileText, className: 'bg-surface text-text-sub' },
  in_review: { label: 'In review', icon: SearchCheck, className: 'bg-status-review-bg text-status-review-text' },
  in_progress: { label: 'In progress', icon: Clock3, className: 'bg-status-progress-bg text-status-progress-text' },
  delivered: { label: 'Ready for review', icon: PackageCheck, className: 'bg-primary-light text-primary-ink' },
  closed: { label: 'Completed', icon: CheckCircle2, className: 'bg-status-closed-bg text-status-closed-text' },
}
export const REQUEST_STEPS = Object.keys(REQUEST_STATUS)

export function RequestStatus({ status }) {
  const config = REQUEST_STATUS[status] || REQUEST_STATUS.received
  const Icon = config.icon
  return <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${config.className}`}><Icon size={13} />{config.label}</span>
}

export function RequestSummary({ request, fresh = false }) {
  return <Link to={`/my-requests/${request.id}`} className={`group block rounded-2xl border bg-layout-card p-4 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-sm sm:p-5 ${fresh ? 'border-primary' : 'border-border'}`}>
    <div className="flex items-start gap-3 sm:gap-4">
      <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-text-sub sm:flex"><FileText size={18} /></div>
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="break-words text-sm font-semibold leading-6 text-text-main sm:text-base">{request.title}</h3><ArrowUpRight size={18} className="mt-1 shrink-0 text-text-dim transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></div><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-sub"><span>#{String(request.id).slice(0, 6)}</span><span className="flex items-center gap-1"><Clock3 size={12} />Updated {timeAgo(request.updated_at)}</span>{request.category && <span>{request.category}</span>}</div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><RequestStatus status={request.status} />{request._hasUnreadMessage ? <span className="flex items-center gap-1.5 text-xs font-medium text-primary-ink"><MessageSquareDot size={14} />New message</span> : request.status === 'delivered' ? <span className="text-xs font-medium text-primary-ink">Review delivery →</span> : null}</div>
      </div>
    </div>
  </Link>
}

export function RequestJourney() {
  return <section className="rounded-2xl border border-border bg-layout-card p-5"><p className="text-sm font-semibold">Request stages</p><p className="mt-1 text-xs leading-5 text-text-sub">Follow progress through each stage.</p><ol className="mt-5 space-y-4">{REQUEST_STEPS.map((status, index) => { const { icon: Icon, label } = REQUEST_STATUS[status]; return <li key={status} className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-text-sub"><Icon size={15} /></span><span className="flex-1 text-xs text-text-sub">{label}</span><span className="text-xs text-text-dim">0{index + 1}</span></li> })}</ol></section>
}
