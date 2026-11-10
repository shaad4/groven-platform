import { Check, CheckCircle2, Clock3, FileText, LayoutDashboard, MessageSquare, Plus, Settings, Users } from 'lucide-react'

const requests = [
  { title: 'Brand identity refresh', project: 'Brand & strategy', status: 'In progress', icon: Clock3, color: 'bg-primary-light text-primary-ink', initials: 'BI' },
  { title: 'Summer campaign assets', project: 'Marketing design', status: 'Ready for review', icon: CheckCircle2, color: 'bg-status-review-bg text-status-review-text', initials: 'SC' },
  { title: 'Homepage illustrations', project: 'Website', status: 'Completed', icon: Check, color: 'bg-surface text-text-sub', initials: 'HI' },
]

export default function ProductPreview({ compact = false }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-layout-card text-left" aria-label="Illustrative Groven workspace preview">
      <div className="flex h-12 items-center justify-between gap-3 border-b border-border px-4 sm:px-5">
        <div className="flex items-center gap-1.5" aria-hidden="true"><span className="h-2 w-2 rounded-full bg-border" /><span className="h-2 w-2 rounded-full bg-border" /><span className="h-2 w-2 rounded-full bg-border" /></div>
        <span className="truncate text-[10px] font-medium text-text-dim">studio.groven.in / workspace</span>
        <span className="text-[9px] font-medium text-text-dim">Example workspace</span>
      </div>
      <div className={`grid ${compact ? '' : 'md:grid-cols-[176px_1fr]'}`}>
        {!compact && <aside className="hidden flex-col border-r border-border bg-surface/60 p-4 md:flex">
          <div className="mb-8 flex items-center gap-2.5"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-on-primary">S</span><div><p className="text-xs font-semibold text-text-main">Studio North</p><p className="mt-0.5 text-[10px] text-text-dim">Your workspace</p></div></div>
          {[{ icon: LayoutDashboard, label: 'Overview', active: true }, { icon: FileText, label: 'Requests' }, { icon: Users, label: 'Clients' }, { icon: MessageSquare, label: 'Activity' }].map(({ icon: Icon, label, active }) => <div key={label} className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-[11px] ${active ? 'bg-primary-light font-semibold text-primary-ink' : 'text-text-sub'}`}><Icon size={14} />{label}</div>)}
          <div className="mt-auto flex items-center gap-2.5 px-3 pt-12 text-[11px] text-text-sub"><Settings size={14} />Settings</div>
        </aside>}
        <div className={`min-w-0 ${compact ? 'p-5' : 'p-4 sm:p-6 lg:p-8'}`}>
          <div className="mb-6 flex items-start justify-between gap-3"><div><p className="mb-1.5 text-[10px] font-medium uppercase tracking-[0.13em] text-text-dim">Studio North</p><h3 className={`${compact ? 'text-xl' : 'text-xl sm:text-2xl'} font-semibold tracking-tight text-text-main`}>Workspace overview</h3></div><span className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-2.5 text-[10px] font-semibold text-on-primary sm:flex"><Plus size={12} /> New request</span></div>
          <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">{[['06', 'Active requests'], ['02', 'Awaiting review'], ['12', 'Completed']].map(([value, label]) => <div key={label} className="rounded-xl border border-border bg-surface/50 p-3 sm:p-4"><p className="text-2xl font-medium tracking-tight text-text-main">{value}</p><p className="mt-2 text-[9px] sm:text-[10px] text-text-sub">{label}</p></div>)}</div>
          <div className="mb-1 flex items-center justify-between border-b border-border pb-3"><h4 className="text-xs font-semibold text-text-main">Recent requests</h4><span className="text-[10px] text-text-dim">View all</span></div>
          <div className="divide-y divide-border">{requests.map(({ title, project, status, icon: Icon, color, initials }) => <div key={title} className="flex items-center justify-between gap-3 py-3.5"><div className="flex min-w-0 items-center gap-3"><span className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-[10px] font-medium text-text-sub sm:flex">{initials}</span><div className="min-w-0"><p className="truncate text-[11px] font-medium text-text-main sm:text-xs">{title}</p><p className="mt-1 text-[10px] text-text-dim">{project}</p></div></div><span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-[8px] font-medium sm:text-[9px] ${color}`}><Icon size={10} />{status}</span></div>)}</div>
        </div>
      </div>
    </div>
  )
}
