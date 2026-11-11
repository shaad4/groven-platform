import { InlinePending } from './Skeleton'

export function AdminButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'h-8 px-3 text-[12px] gap-1.5',
    md: 'h-10 px-4 text-[13px] gap-2',
  }

  const variants = {
    primary: 'bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50',
    danger: 'bg-red-600 text-on-primary hover:bg-red-700 disabled:opacity-50',
    secondary: 'bg-layout-card border border-border text-text-main hover:bg-surface disabled:opacity-50',
    ghost: 'text-text-sub hover:bg-surface disabled:opacity-50',
    dangerGhost: 'border border-status-danger-text/20 text-status-danger-text hover:bg-status-danger-bg disabled:opacity-50',
  }

  return (
    <button
      {...props}
      type={props.type || 'button'}
      aria-busy={loading}
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <InlinePending label="Working" />
      ) : Icon && <Icon size={14} aria-hidden="true" />}
      {children}
    </button>
  )
}

const PLAN_STYLES = {
  free: 'bg-surface text-text-sub',
  pro: 'bg-primary-light text-primary-ink',
}

export function PlanBadge({ plan }) {
  const key = (plan || 'free').toLowerCase()
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${PLAN_STYLES[key] || PLAN_STYLES.free}`}>
      {plan || 'Free'}
    </span>
  )
}

const STATUS_STYLES = {
  active: { dot: 'var(--success-text)', text: 'var(--success-text)' },
  suspended: { dot: 'var(--danger-text)', text: 'var(--danger-text)' },
  deactivated: { dot: 'var(--danger-text)', text: 'var(--danger-text)' },
  pending: { dot: 'var(--review-text)', text: 'var(--review-text)' },
}

export function StatusPill({ status }) {
  const key = (status || '').toLowerCase().replace(/\s+/g, '_')
  const style = STATUS_STYLES[key] || STATUS_STYLES.pending
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-medium" style={{ color: style.text }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: style.dot }} />
      {status}
    </span>
  )
}

export function RoleBadge({ role }) {
  const isProvider = role === 'provider'
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${
        isProvider ? 'bg-status-progress-bg text-status-progress-text' : 'bg-primary-light text-primary-ink'
      }`}
    >
      {role}
    </span>
  )
}

// Usage meter — thin bar with numeric label, color escalates near/at limit
export function UsageBar({ used, limit, label }) {
  const unlimited = limit === -1 || limit == null
  const pct = unlimited ? 0 : limit > 0 ? Math.max(0, Math.min(100, Math.round((used / limit) * 100))) : used > 0 ? 100 : 0
  const atLimit = !unlimited && used >= limit
  const near = !unlimited && pct >= 80 && !atLimit

  const barColor = atLimit ? 'var(--danger-text)' : near ? 'var(--review-text)' : 'var(--success-text)'

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[12px]">
        <span className="text-text-sub">{label}</span>
        <span className={`font-medium ${atLimit ? 'text-status-danger-text' : near ? 'text-status-review-text' : 'text-text-main'}`}>
          {unlimited ? `${used} / Unlimited` : `${used} / ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-1.5 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
      )}
    </div>
  )
}
