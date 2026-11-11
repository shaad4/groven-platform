import { clsx } from 'clsx'

export function Skeleton({ className, ...props }) {
  return <span {...props} aria-hidden="true" className={clsx('skeleton block rounded-md', className)} />
}

export function InlinePending({ label = 'Loading', className }) {
  return (
    <span role="status" className={clsx('inline-flex shrink-0 items-center gap-1', className)}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="skeleton skeleton-inline h-2 w-5 rounded-full" />
      <span aria-hidden="true" className="skeleton skeleton-inline h-2 w-2 rounded-full" />
    </span>
  )
}

export function PageSkeleton({ label = 'Loading page', variant = 'detail', className }) {
  return (
    <div role="status" aria-busy="true" className={clsx('mx-auto w-full max-w-7xl space-y-8 p-6 sm:p-8', className)}>
      <span className="sr-only">{label}</span>
      <div className="flex items-center justify-between gap-6">
        <div className="w-full space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-2/3 max-w-72" /></div>
        <Skeleton className="h-10 w-24 shrink-0 rounded-xl" />
      </div>
      {variant === 'dashboard' && <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-5 rounded-xl border border-border bg-layout-card p-5"><Skeleton className="h-3 w-20" /><Skeleton className="h-8 w-14" /><Skeleton className="h-2 w-3/4" /></div>)}</div>}
      {variant === 'form' ? (
        <div className="max-w-xl space-y-6 rounded-2xl border border-border bg-layout-card p-6">{Array.from({ length: 4 }, (_, i) => <div key={i} className="space-y-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-11 w-full rounded-xl" /></div>)}<Skeleton className="h-11 w-32 rounded-xl" /></div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-layout-card">
          <div className="flex items-center justify-between gap-4 border-b border-border p-5"><Skeleton className="h-5 w-32" /><Skeleton className="h-8 w-28 rounded-lg" /></div>
          {Array.from({ length: variant === 'detail' ? 4 : 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border p-5 last:border-b-0">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-3"><Skeleton className={clsx('h-3', i % 2 ? 'w-2/5' : 'w-3/5')} /><Skeleton className="h-2 w-1/3" /></div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Skeleton
